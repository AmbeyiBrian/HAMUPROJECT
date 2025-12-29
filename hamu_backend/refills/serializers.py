from rest_framework import serializers
from .models import Refills
from customers.serializers import CustomerLightSerializer
from packages.serializers import PackageSerializer
from shops.serializers import ShopSerializer
from sms.utils import send_free_refill_notification, send_free_refill_thank_you_sms
from stock.services import StockCalculationService
from django.db import transaction


class RefillSerializer(serializers.ModelSerializer):
    customer_details = CustomerLightSerializer(source='customer', read_only=True)
    package_details = PackageSerializer(source='package', read_only=True)
    shop_details = ShopSerializer(source='shop', read_only=True)
    is_next_refill_free = serializers.SerializerMethodField()
    free_refills_available = serializers.SerializerMethodField()
    client_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = Refills
        fields = [
            'id', 'client_id', 'customer', 'customer_details', 'shop', 'shop_details',
            'package', 'package_details', 'quantity', 'payment_mode', 
            'cost', 'is_free', 'is_partially_free', 'free_quantity', 
            'paid_quantity', 'loyalty_refill_count', 'delivered', 
            'created_at', 'agent_name', 'is_next_refill_free',
            'free_refills_available'
        ]
        extra_kwargs = {
            'customer': {'write_only': True},
            'shop': {'write_only': True},
            'package': {'write_only': True},
            'created_at': {'required': False},  # Optional - defaults to now()
        }
    
    def get_is_next_refill_free(self, obj):
        """Check if the customer's next refill should be free based on loyalty."""
        if not obj.customer:
            return False
        
        # Get the shop's freeRefillInterval setting
        interval = obj.shop.freeRefillInterval
        if interval <= 0:
            return False
            
        # Count refills since the last free refill using the loyalty_refill_count
        refills_since_free = 0
        
        # Get all refills since the last free refill
        last_free_refill = Refills.objects.filter(
            customer=obj.customer,
            is_free=True
        ).order_by('-created_at').first()
        
        # If there was a last free refill, get refills after that
        if last_free_refill:
            refills_query = Refills.objects.filter(
                customer=obj.customer,
                created_at__gt=last_free_refill.created_at,
                is_free=False
            )
        else:
            # Otherwise get all non-free refills
            refills_query = Refills.objects.filter(
                customer=obj.customer,
                is_free=False
            )
        
        # Sum the loyalty_refill_count field
        refills_since_free = sum(refills_query.values_list('loyalty_refill_count', flat=True))
        
        # Return True if customer has reached the threshold
        return refills_since_free >= interval
    
    def get_free_refills_available(self, obj):
        """Calculate how many free refills the customer has earned."""
        if not obj.customer:
            return 0
            
        # Get the shop's freeRefillInterval setting
        interval = obj.shop.freeRefillInterval
        if interval <= 0:
            return 0
            
        # Count refills since the last free refill using the loyalty_refill_count
        refills_since_free = 0
        
        # Get all refills since the last free refill
        last_free_refill = Refills.objects.filter(
            customer=obj.customer,
            is_free=True
        ).order_by('-created_at').first()
        
        # If there was a last free refill, get refills after that
        if last_free_refill:
            refills_query = Refills.objects.filter(
                customer=obj.customer,
                created_at__gt=last_free_refill.created_at,
                is_free=False
            )
        else:
            # Otherwise get all non-free refills
            refills_query = Refills.objects.filter(
                customer=obj.customer,
                is_free=False
            )
        
        # Sum the loyalty_refill_count field
        refills_since_free = sum(refills_query.values_list('loyalty_refill_count', flat=True))
        
        # Calculate how many free refills are available
        return refills_since_free // interval
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create a new refill record with data from the frontend.
        Also deducts caps and labels from inventory based on refill package.
        If client_id exists, return existing record (idempotency for offline sync).
        For offline transactions, recalculates loyalty to ensure customers get their free refills.
        """
        from django.db.models import Sum
        
        # Check for existing record with same client_id (offline sync idempotency)
        client_id = validated_data.get('client_id')
        if client_id:
            existing = Refills.objects.filter(client_id=client_id).first()
            if existing:
                return existing  # Return existing, don't create duplicate
        
        customer = validated_data.get('customer')
        shop = validated_data.get('shop')
        package = validated_data.get('package')
        agent_name = validated_data.get('agent_name', 'System')
        quantity = validated_data.get('quantity', 1)
        
        # Set created_at to now() if not provided
        from django.utils import timezone
        if 'created_at' not in validated_data or validated_data['created_at'] is None:
            validated_data['created_at'] = timezone.now()
        
        # If this is an offline transaction (has client_id), check if customer was eligible for free refills
        # but was charged full price. If so, create a credit record for the overpayment.
        # IMPORTANT: We do NOT recalculate the cost - customer already paid at POS.
        # Instead, we track what should have been free and create a credit for their next visit.
        offline_credit_amount = 0
        if client_id and customer and package and shop:
            free_refill_interval = shop.freeRefillInterval
            original_cost = validated_data.get('cost', 0)
            
            if free_refill_interval > 0:
                # Get total refill quantity for this customer and package BEFORE this transaction
                total_before = Refills.objects.filter(
                    customer=customer,
                    package=package
                ).aggregate(total=Sum('quantity'))['total'] or 0
                
                total_after = total_before + quantity
                
                # Calculate thresholds crossed
                thresholds_before = total_before // free_refill_interval
                thresholds_after = total_after // free_refill_interval
                
                # Free quantity is the number of new thresholds crossed
                free_quantity = min(thresholds_after - thresholds_before, quantity)
                paid_quantity = quantity - free_quantity
                
                # Calculate what the cost SHOULD have been
                correct_cost = package.price * paid_quantity
                
                # If customer overpaid, calculate the credit amount
                if original_cost > correct_cost:
                    offline_credit_amount = float(original_cost - correct_cost)
                
                # Update validated_data with loyalty info (but keep original cost!)
                validated_data['free_quantity'] = free_quantity
                validated_data['paid_quantity'] = paid_quantity
                validated_data['loyalty_refill_count'] = paid_quantity  # Only paid count toward loyalty
                # Mark as partially free if applicable (for display purposes)
                validated_data['is_free'] = free_quantity > 0 and paid_quantity == 0
                validated_data['is_partially_free'] = free_quantity > 0 and paid_quantity > 0
                # NOTE: We intentionally do NOT update 'cost' - customer already paid this amount
                
                if offline_credit_amount > 0:
                    print(f"[Offline Sync] Customer overpaid by {offline_credit_amount}. Creating credit balance.")
        
        # Create the refill record with (possibly recalculated) data
        refill = super().create(validated_data)
        
        # Process inventory deduction for caps and labels
        try:
            StockCalculationService.deduct_caps_and_labels_for_refill(refill, agent_name)
        except ValueError as e:
            # Log the error but don't prevent the refill from being recorded
            # This allows the business to continue even if stock tracking has issues
            print(f"Inventory deduction warning: {str(e)}")
        
        # If this was an offline-synced refill and customer overpaid, create a credit record
        if offline_credit_amount > 0 and customer:
            from credits.models import Credits
            from decimal import Decimal
            from django.utils import timezone
            
            # Create credit record with positive money_paid
            # This represents the customer's overpayment which reduces their outstanding credit
            # If outstanding goes negative, customer has credit balance for future purchases
            # Note: agent_name is varchar(20), so keep it short
            Credits.objects.create(
                customer=customer,
                shop=shop,
                money_paid=Decimal(str(offline_credit_amount)),  # Positive = reduces outstanding
                payment_mode='CASH',  # Original payment was made at POS
                payment_date=timezone.now(),
                agent_name='OfflineSync'  # Short name to fit varchar(20)
            )
            print(f"[Offline Sync] Created credit payment of {offline_credit_amount} for customer {customer.id}")
        
        # Handle credit_applied from mobile app
        # When customer uses their credit balance, we need to deduct it
        credit_applied = self.initial_data.get('credit_applied', 0)
        if credit_applied and float(credit_applied) > 0 and customer:
            from credits.models import Credits
            from decimal import Decimal
            from django.utils import timezone
            
            # Create a refill with CREDIT payment mode to consume the credit balance
            # This increases the customer's "total_credit_owed" which offsets their "total_repaid"
            Credits.objects.create(
                customer=customer,
                shop=shop,
                money_paid=Decimal(str(-float(credit_applied))),  # Negative = deducts from balance
                payment_mode='CASH',  # Was applied as payment for this refill
                payment_date=timezone.now(),
                agent_name='CreditUsed'  # Short name to fit varchar(20)
            )
            print(f"[Refill] Customer {customer.id} used credit balance of {credit_applied}")
        
        # Only send notifications for ONLINE transactions (not offline-synced ones)
        # Offline-synced transactions (with client_id) should not trigger SMS because:
        # 1. The transaction happened in the past
        # 2. Customer already left the shop
        # 3. Sending "free refill" SMS when they paid full price would be confusing
        if customer and not client_id:
            # Send SMS notification if this was a free/partially free refill
            if refill.free_quantity > 0:
                # Use the new function that includes free quantity information
                send_free_refill_thank_you_sms(refill.customer, refill.free_quantity, refill.package.water_amount_label)
            # If customer is close to earning a free refill, notify them
            elif shop and shop.freeRefillInterval > 0:
                # Calculate refills since last free one
                last_free_refill = Refills.objects.filter(
                    customer=customer,
                    is_free=True
                ).order_by('-created_at').first()
                
                if last_free_refill:
                    refills_query = Refills.objects.filter(
                        customer=customer,
                        created_at__gt=last_free_refill.created_at,
                        is_free=False
                    )
                else:
                    refills_query = Refills.objects.filter(
                        customer=customer,
                        is_free=False
                    )
                
                refills_since_free = sum(refills_query.values_list('loyalty_refill_count', flat=True))
                
                # If they're one refill away from a free one
                if shop.freeRefillInterval > 0:
                    remaining_for_free = shop.freeRefillInterval - (refills_since_free % shop.freeRefillInterval)
                    if remaining_for_free == 1:
                        send_free_refill_notification(customer, is_thankyou=False)
        
        return refill