from rest_framework import serializers
from .models import Sales
from customers.serializers import CustomerLightSerializer
from packages.serializers import PackageSerializer
from shops.serializers import ShopSerializer
from stock.services import StockCalculationService
from django.db import transaction


class SalesSerializer(serializers.ModelSerializer):
    customer_details = CustomerLightSerializer(source='customer', read_only=True)
    package_details = PackageSerializer(source='package', read_only=True)
    shop_details = ShopSerializer(source='shop', read_only=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = Sales
        fields = [
            'id', 'client_id', 'customer', 'customer_details', 'shop', 'shop_details',
            'package', 'package_details', 'quantity', 'payment_mode', 
            'cost', 'sold_at', 'agent_name'
        ]
        extra_kwargs = {
            'customer': {'write_only': True},
            'shop': {'write_only': True},
            'package': {'write_only': True},
            'sold_at': {'required': False},  # Optional - defaults to now()
        }
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create a new sale record and deduct appropriate inventory items.
        - For bottle sales: deducts bottles and labels
        - For water bundles: deducts the corresponding bundle
        - If client_id exists, return existing record (idempotency for offline sync)
        """
        # Check for existing record with same client_id (offline sync idempotency)
        client_id = validated_data.get('client_id')
        if client_id:
            existing = Sales.objects.filter(client_id=client_id).first()
            if existing:
                return existing  # Return existing, don't create duplicate
        
        agent_name = validated_data.get('agent_name', 'System')
        
        # Set sold_at to now() if not provided
        from django.utils import timezone
        if 'sold_at' not in validated_data or validated_data['sold_at'] is None:
            validated_data['sold_at'] = timezone.now()
        
        # Create the sale record
        sale = super().create(validated_data)
        
        # Process inventory deduction for the sale
        try:
            StockCalculationService.deduct_stock_for_sale(sale, agent_name)
        except ValueError as e:
            # Log the error but don't prevent the sale from being recorded
            # This allows business to continue even if stock tracking has issues
            print(f"Inventory deduction warning: {str(e)}")
        
        return sale