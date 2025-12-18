from rest_framework import serializers
from .models import Credits
from customers.serializers import CustomerLightSerializer
from shops.serializers import ShopSerializer


class CreditsSerializer(serializers.ModelSerializer):
    customer_details = CustomerLightSerializer(source='customer', read_only=True)
    shop_details = ShopSerializer(source='shop', read_only=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = Credits
        fields = [
            'id', 'client_id', 'customer', 'customer_details', 'shop', 'shop_details',
            'money_paid', 'payment_mode', 'payment_date', 'agent_name', 'created_at', 'modified_at', 
        ]
        extra_kwargs = {
            'customer': {'write_only': True},
            'shop': {'write_only': True}
        }
    
    def create(self, validated_data):
        """Create credit payment with idempotency for offline sync."""
        client_id = validated_data.get('client_id')
        if client_id:
            existing = Credits.objects.filter(client_id=client_id).first()
            if existing:
                return existing
        return super().create(validated_data)