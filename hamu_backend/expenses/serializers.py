from rest_framework import serializers
from .models import Expenses
from shops.serializers import ShopSerializer


class ExpensesSerializer(serializers.ModelSerializer):
    shop_details = ShopSerializer(source='shop', read_only=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = Expenses
        fields = [
            'id', 'client_id', 'shop', 'shop_details', 'description', 'cost',
            'receipt', 'agent_name', 'created_at'
        ]
        extra_kwargs = {
            'shop': {'write_only': True}
        }
    
    def create(self, validated_data):
        """Create expense with idempotency for offline sync."""
        client_id = validated_data.get('client_id')
        if client_id:
            existing = Expenses.objects.filter(client_id=client_id).first()
            if existing:
                return existing
        return super().create(validated_data)