from rest_framework import serializers
from stock.models import StockItem, StockLog
from shops.models import Shops

class InventoryAdjustmentSerializer(serializers.Serializer):
    """
    Serializer for inventory adjustments. 
    This serializer is used for the inventory adjustment endpoint.
    """
    id = serializers.IntegerField(required=True, help_text="The ID of the stock item to adjust")
    quantity = serializers.IntegerField(required=True, help_text="The quantity to adjust by (positive number)")
    reason = serializers.CharField(required=True, help_text="Reason for the adjustment")
    adjustment_type = serializers.ChoiceField(
        choices=['add', 'subtract', 'set'], 
        required=True, 
        help_text="Type of adjustment: add, subtract, or set to exact value"
    )
    shop_id = serializers.CharField(required=True, help_text="Shop ID where the adjustment is taking place")

    def validate_quantity(self, value):
        """
        Ensure quantity is positive
        """
        if value <= 0:
            raise serializers.ValidationError("Quantity must be a positive number")
        return value
        
    def validate(self, data):
        """
        Custom validation for the entire serializer
        """
        # Check if stock item exists
        try:
            stock_item = StockItem.objects.get(id=data['id'])
        except StockItem.DoesNotExist:
            raise serializers.ValidationError({"id": "Stock item with this ID does not exist"})
            
        # Check if shop exists
        try:
            if data['shop_id'] != 'all':
                shop = Shops.objects.get(id=data['shop_id'])
                # Check if stock item belongs to this shop
                if stock_item.shop.id != shop.id:
                    raise serializers.ValidationError(
                        {"shop_id": "Stock item does not belong to this shop"}
                    )
        except Shops.DoesNotExist:
            raise serializers.ValidationError({"shop_id": "Shop with this ID does not exist"})
            
        # For subtract adjustment, check if we have enough quantity
        if data['adjustment_type'] == 'subtract':
            current_quantity = StockCalculationService.get_current_stock_level(stock_item)
            if data['quantity'] > current_quantity:
                raise serializers.ValidationError(
                    {"quantity": f"Not enough stock. Current quantity is {current_quantity}"}
                )
                
        return data


class StockItemAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer for stock items in analytics responses
    """
    quantity = serializers.IntegerField(read_only=True, help_text="Current quantity based on stock logs")
    shop_name = serializers.CharField(source='shop.shopName', read_only=True)
    
    class Meta:
        model = StockItem
        fields = ['id', 'shop', 'shop_name', 'item_name', 'item_type', 
                 'quantity', 'threshold', 'reorder_point']


class StockLogAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer for stock logs in analytics responses
    """
    item_name = serializers.CharField(source='stock_item.item_name', read_only=True)
    item_type = serializers.CharField(source='stock_item.item_type', read_only=True)
    shop_name = serializers.CharField(source='shop.shopName', read_only=True)
    
    class Meta:
        model = StockLog
        fields = ['id', 'stock_item', 'item_name', 'item_type', 'quantity_change',
                 'notes', 'shop', 'shop_name', 'director_name', 'log_date']


class InventoryHistoryResponseSerializer(serializers.Serializer):
    """
    Serializer for formatting inventory history responses
    """
    entries = StockLogAnalyticsSerializer(many=True)
    total_count = serializers.IntegerField()
    prev_quantity = serializers.IntegerField(help_text="Previous quantity")
    new_quantity = serializers.IntegerField(help_text="Current quantity")
