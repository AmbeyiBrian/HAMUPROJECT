from rest_framework import serializers

from django.utils import timezone
from datetime import datetime, timedelta
import uuid

from stock.models import StockItem, StockLog
from shops.models import Shops
from stock.services import StockCalculationService

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
    shop_id = serializers.CharField(required=False, help_text="Shop ID where the adjustment is taking place")
    
    def validate_quantity(self, value):
        """
        Ensure quantity is positive
        """
        if value <= 0:
            raise serializers.ValidationError("Quantity must be a positive number")
        return value
