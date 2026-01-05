from rest_framework import serializers
from .models import Customers
from shops.serializers import ShopSerializer
import datetime
from django.utils import timezone


class CustomerSerializer(serializers.ModelSerializer):
    shop_details = ShopSerializer(source='shop', read_only=True)
    refill_count = serializers.IntegerField(source='refills.count', read_only=True)
    packages = serializers.SerializerMethodField()
    loyalty = serializers.SerializerMethodField()
    client_id = serializers.UUIDField(required=False, allow_null=True)
    activity_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Customers
        fields = [
            'id', 'client_id', 'shop', 'shop_details', 'names', 'phone_number', 
            'apartment_name', 'room_number', 'date_registered', 'refill_count',
            'packages', 'loyalty', 'activity_status'
        ]
        extra_kwargs = {
            'shop': {'write_only': True},
            'date_registered': {'required': False},  # Optional - defaults to now()
        }
    
    def create(self, validated_data):
        """Create customer with idempotency for offline sync."""
        client_id = validated_data.get('client_id')
        if client_id:
            existing = Customers.objects.filter(client_id=client_id).first()
            if existing:
                return existing
        
        # Set date_registered to now() if not provided
        if 'date_registered' not in validated_data or validated_data['date_registered'] is None:
            validated_data['date_registered'] = timezone.now()
        
        return super().create(validated_data)

    def get_packages(self, obj):
        """
        Get a summary of packages this customer has purchased, 
        including both refill packages and sales packages.
        Returns a dict with package information and counts.
        """
        packages_summary = {}
        
        # Get packages from refills
        if hasattr(obj, 'refills'):
            for refill in obj.refills.all():
                if hasattr(refill, 'package'):
                    package = refill.package
                    package_key = f"{package.water_amount_label}L {package.sale_type}"
                    
                    if package_key not in packages_summary:
                        packages_summary[package_key] = {
                            'id': package.id,
                            'water_amount': float(package.water_amount_label),
                            'sale_type': package.sale_type,
                            'description': package.description,
                            'count': 0,
                            'total_quantity': 0
                        }
                    
                    # Increment counts
                    packages_summary[package_key]['count'] += 1
                    packages_summary[package_key]['total_quantity'] += refill.quantity
        
        # Get packages from sales
        if hasattr(obj, 'sales'):
            for sale in obj.sales.all():
                if hasattr(sale, 'package'):
                    package = sale.package
                    bottle_type = package.bottle_type or 'N/A'
                    package_key = f"{package.water_amount_label}L {bottle_type} {package.sale_type}"
                    
                    if package_key not in packages_summary:
                        packages_summary[package_key] = {
                            'id': package.id,
                            'water_amount': float(package.water_amount_label),
                            'sale_type': package.sale_type,
                            'bottle_type': bottle_type,
                            'description': package.description,
                            'count': 0,
                            'total_quantity': 0
                        }
                    
                    # Increment counts
                    packages_summary[package_key]['count'] += 1
                    packages_summary[package_key]['total_quantity'] += sale.quantity
        
        # Convert dict to list for the API response
        return list(packages_summary.values())

    def get_loyalty(self, obj):
        """
        Calculate loyalty program information including:
        - current_points: customer's current loyalty point count
        - refills_until_free: number of refills needed for free refill
        - free_refills_redeemed: total number of free refills redeemed
        """
        if not hasattr(obj, 'refills') or not hasattr(obj, 'shop'):
            return {
                'current_points': 0,
                'refills_until_free': 10,
                'free_refills_redeemed': 0
            }
        
        # Get the shop's free refill interval setting
        shop = obj.shop
        free_refill_interval = getattr(shop, 'freeRefillInterval', 10)  # Default to 10 if not set
        
        # Get all refills for this customer
        refills = obj.refills.all()
        total_refills = refills.count()
        
        # Get refill quantities rather than just counting refills
        refill_quantities = sum(getattr(refill, 'quantity', 1) or 1 for refill in refills)
        
        # Count free refills from the database
        free_refills = refills.filter(is_free=True).count()
        
        # Calculate the total free refills based on the shop's interval
        # This is the theoretical number based on total quantities divided by interval
        calculated_free_refills = refill_quantities // free_refill_interval
        
        # Use the larger of actual counted free refills or calculated free refills
        free_refills_redeemed = max(free_refills, calculated_free_refills)
        
        # Calculate paid quantities (total minus free)
        paid_quantities = refill_quantities - free_refills_redeemed
        
        # Calculate current points based on paid quantities
        current_points = paid_quantities % free_refill_interval
        
        # Calculate refills until next free reward
        refills_until_free = free_refill_interval - current_points if current_points > 0 else free_refill_interval
        
        return {
            'current_points': current_points,
            'refills_until_free': refills_until_free,
            'free_refills_redeemed': free_refills_redeemed
        }
    
    def get_activity_status(self, obj):
        """
        Calculate activity status based on most recent refill date.
        Returns one of: 'Very Active', 'Active', 'Irregular', 'Inactive', 'New'
        """
        # Get the most recent refill for this customer
        latest_refill = None
        if hasattr(obj, 'refills'):
            latest_refill = obj.refills.order_by('-created_at').first()
        
        if not latest_refill:
            # No refills - check if it's a new customer (registered within last 30 days)
            if obj.date_registered:
                days_since_registration = (timezone.now() - obj.date_registered).days
                if days_since_registration <= 30:
                    return 'New'
            return 'Inactive'
        
        # Calculate days since last refill
        days_since_last_refill = (timezone.now() - latest_refill.created_at).days
        
        if days_since_last_refill <= 30:
            return 'Very Active'
        elif days_since_last_refill <= 60:
            return 'Active'
        elif days_since_last_refill <= 90:
            return 'Irregular'
        else:
            return 'Inactive'

class CustomerLightSerializer(serializers.ModelSerializer):
    """A lightweight serializer for Customers with minimal fields."""
    class Meta:
        model = Customers
        fields = ['id', 'shop', 'names', 'phone_number']

class CustomerInsightSerializer(serializers.ModelSerializer):
    """
    A specialized serializer for Customer Insights page with additional computed fields
    needed by the frontend components.
    """
    shop_details = ShopSerializer(source='shop', read_only=True)
    refill_count = serializers.IntegerField(source='refills.count', read_only=True)
    
    # Adding fields needed by frontend with both naming conventions
    name = serializers.CharField(source='names', read_only=True)
    phone = serializers.CharField(source='phone_number', read_only=True)
      # These will be computed in to_representation
    refills = serializers.SerializerMethodField()
    purchases = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    last_refill = serializers.SerializerMethodField()
    activity_status = serializers.SerializerMethodField()
    packages = serializers.SerializerMethodField()
    credit = serializers.SerializerMethodField('get_credit_info')
    loyalty = serializers.SerializerMethodField()
    trends = serializers.SerializerMethodField()
    loyalty = serializers.SerializerMethodField()
    trends = serializers.SerializerMethodField()
    
    class Meta:
        model = Customers
        fields = [
            'id', 'shop', 'shop_details', 'names', 'phone_number', 
            'apartment_name', 'room_number', 'date_registered', 'refill_count',
            # Additional fields for frontend compatibility
            'name', 'phone', 'refills', 'purchases', 'total_spent', 
            'last_refill', 'activity_status', 'packages', 'credit',
            'loyalty', 'trends'
        ]
    
    def get_refills(self, obj):
        # This is the same as refill_count, but with a different name for frontend compatibility
        return obj.refills.count() if hasattr(obj, 'refills') else 0
    
    def get_purchases(self, obj):
        # Count bottle sales for this customer
        return obj.sales.count() if hasattr(obj, 'sales') else 0

    def get_total_spent(self, obj):
        # Calculate total amount spent by summing refills and sales
        total = 0
        
        # Sum refills
        if hasattr(obj, 'refills'):
            for refill in obj.refills.all():
                if hasattr(refill, 'cost'):
                    total += refill.cost or 0
        
        # Sum sales
        if hasattr(obj, 'sales'):
            for sale in obj.sales.all():
                if hasattr(sale, 'cost'):
                    total += sale.cost or 0

        return total
    
    def get_last_refill(self, obj):
        # Get date of most recent refill
        latest_refill = obj.refills.order_by('-created_at').first() if hasattr(obj, 'refills') else None
        if latest_refill and hasattr(latest_refill, 'created_at'):
            return latest_refill.created_at.strftime('%Y-%m-%d')
        return None
    
    def get_activity_status(self, obj):
        # Calculate activity status based on most recent refill
        import datetime
        
        latest_refill = obj.refills.order_by('-created_at').first() if hasattr(obj, 'refills') else None
        
        if not latest_refill:
            # Check if it's a new customer (within last 30 days)
            if obj.date_registered and (datetime.datetime.now(datetime.timezone.utc) - obj.date_registered).days <= 30:
                return 'New'
            return 'Inactive'
            
        days_since_last_refill = (datetime.datetime.now(datetime.timezone.utc) - latest_refill.created_at).days
        
        if days_since_last_refill <= 30:
            return 'Very Active'
        elif days_since_last_refill <= 60:
            return 'Active'
        elif days_since_last_refill <= 90:
            return 'Irregular'
        else:
            return 'Inactive'
    
    def get_packages(self, obj):
        """
        Get a summary of packages this customer has purchased, 
        including both refill packages and sales packages.
        Returns a dict with package information and counts.
        """
        packages_summary = {}
        
        # Get packages from refills
        if hasattr(obj, 'refills'):
            for refill in obj.refills.all():
                if hasattr(refill, 'package'):
                    package = refill.package
                    package_key = f"{package.water_amount_label}L {package.sale_type}"
                    
                    if package_key not in packages_summary:
                        packages_summary[package_key] = {
                            'id': package.id,
                            'water_amount': float(package.water_amount_label),
                            'sale_type': package.sale_type,
                            'description': package.description,
                            'count': 0,
                            'total_quantity': 0
                        }
                    
                    # Increment counts
                    packages_summary[package_key]['count'] += 1
                    packages_summary[package_key]['total_quantity'] += refill.quantity
        
        # Get packages from sales
        if hasattr(obj, 'sales'):
            for sale in obj.sales.all():
                if hasattr(sale, 'package'):
                    package = sale.package
                    bottle_type = package.bottle_type or 'N/A'
                    package_key = f"{package.water_amount_label}L {bottle_type} {package.sale_type}"
                    
                    if package_key not in packages_summary:
                        packages_summary[package_key] = {
                            'id': package.id,
                            'water_amount': float(package.water_amount_label),
                            'sale_type': package.sale_type,
                            'bottle_type': bottle_type,
                            'description': package.description,
                            'count': 0,
                            'total_quantity': 0
                        }
                    
                    # Increment counts
                    packages_summary[package_key]['count'] += 1
                    packages_summary[package_key]['total_quantity'] += sale.quantity
        
        # Convert dict to list for the API response
        return list(packages_summary.values())
      # Method to get credit information
    def get_credit_info(self, obj):
        """
        Calculates customer's credit information including:
        - total_credit: total amount given as credit
        - outstanding: current outstanding credit amount
        - repayment_rate: percentage of credit repaid
        """
        # Calculate total credit given (from sales and refills with CREDIT payment mode)
        total_credit = 0
        
        # Add up credit from refills
        if hasattr(obj, 'refills'):
            credit_refills = obj.refills.filter(payment_mode='CREDIT')
            for refill in credit_refills:
                if hasattr(refill, 'cost'):
                    total_credit += refill.cost or 0
        
        # Add up credit from sales
        if hasattr(obj, 'sales'):
            credit_sales = obj.sales.filter(payment_mode='CREDIT')
            for sale in credit_sales:
                if hasattr(sale, 'cost'):
                    total_credit += sale.cost or 0
        
        # Calculate total repayments
        total_repaid = 0
        if hasattr(obj, 'credit_payments'):
            for payment in obj.credit_payments.all():
                if hasattr(payment, 'money_paid'):
                    total_repaid += payment.money_paid or 0
        
        # Calculate outstanding amount
        outstanding = max(0, total_credit - total_repaid)
        
        # Calculate repayment rate
        repayment_rate = 100
        if total_credit > 0:
            repayment_rate = min(100, round((total_repaid / total_credit) * 100))
        
        return {
            'total_credit': total_credit,
            'outstanding': outstanding,
            'repayment_rate': repayment_rate
        }
      # Method to get loyalty information
    def get_loyalty(self, obj):
        """
        Calculate loyalty program information including:
        - current_points: customer's current loyalty point count
        - refills_until_free: number of refills needed for free refill
        - free_refills_redeemed: total number of free refills redeemed
        """
        if not hasattr(obj, 'refills') or not hasattr(obj, 'shop'):
            return {
                'current_points': 0,
                'refills_until_free': 10,
                'free_refills_redeemed': 0
            }
        
        # Get the shop's free refill interval setting
        shop = obj.shop
        free_refill_interval = getattr(shop, 'freeRefillInterval', 10)  # Default to 10 if not set
        
        # Get all refills for this customer
        refills = obj.refills.all()
        total_refills = refills.count()
        
        # Get refill quantities rather than just counting refills
        refill_quantities = sum(getattr(refill, 'quantity', 1) or 1 for refill in refills)
        
        # Count free refills from the database
        free_refills = refills.filter(is_free=True).count()
        
        # Calculate the total free refills based on the shop's interval
        # This is the theoretical number based on total quantities divided by interval
        calculated_free_refills = refill_quantities // free_refill_interval
        
        # Use the larger of actual counted free refills or calculated free refills
        free_refills_redeemed = max(free_refills, calculated_free_refills)
        
        # Calculate paid quantities (total minus free)
        paid_quantities = refill_quantities - free_refills_redeemed
        
        # Calculate current points based on paid quantities
        current_points = paid_quantities % free_refill_interval
        
        # Calculate refills until next free reward
        refills_until_free = free_refill_interval - current_points if current_points > 0 else free_refill_interval
        
        return {
            'current_points': current_points,
            'refills_until_free': refills_until_free,
            'free_refills_redeemed': free_refills_redeemed
        }
    
    # Method to get behavioral trends
    def get_trends(self, obj):
        """
        Calculate customer behavioral trends:
        - monthly_refills: count of refills by month
        - monthly_spending: amount spent by month
        - purchase_days: days of the week when purchases are made
        """
        if not hasattr(obj, 'refills') and not hasattr(obj, 'sales'):
            return {
                'monthly_refills': [],
                'monthly_spending': [],
                'purchase_days': []
            }
        
        # Initialize data structures
        refills_by_month = {}
        spending_by_month = {}
        purchase_days = []
        
        # Process refill data
        if hasattr(obj, 'refills'):
            for refill in obj.refills.all():
                date = refill.created_at
                month_year = date.strftime('%b-%y')  # Format like "Jan-22"
                
                # Update refills by month
                if month_year not in refills_by_month:
                    refills_by_month[month_year] = 0
                refills_by_month[month_year] += 1
                
                # Update spending by month
                if month_year not in spending_by_month:
                    spending_by_month[month_year] = 0
                if hasattr(refill, 'cost'):
                    spending_by_month[month_year] += refill.cost or 0
                
                # Track purchase day
                purchase_days.append(date.strftime('%A'))  # Full weekday name
        
        # Process sales data
        if hasattr(obj, 'sales'):
            for sale in obj.sales.all():
                date = sale.sold_at
                month_year = date.strftime('%b-%y')
                
                # Update spending by month
                if month_year not in spending_by_month:
                    spending_by_month[month_year] = 0
                if hasattr(sale, 'cost'):
                    spending_by_month[month_year] += sale.cost or 0
                
                # Track purchase day
                purchase_days.append(date.strftime('%A'))
        
        # Convert to list format for API
        monthly_refills = [{'month': k, 'count': v} for k, v in refills_by_month.items()]
        monthly_spending = [{'month': k, 'amount': v} for k, v in spending_by_month.items()]
        
        # Sort by date
        monthly_refills.sort(key=lambda x: x['month'])
        monthly_spending.sort(key=lambda x: x['month'])
        
        return {
            'monthly_refills': monthly_refills,
            'monthly_spending': monthly_spending,
            'purchase_days': purchase_days
        }