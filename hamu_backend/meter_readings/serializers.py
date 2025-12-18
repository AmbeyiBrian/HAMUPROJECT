from rest_framework import serializers
from .models import MeterReading
from shops.serializers import ShopSerializer


class MeterReadingSerializer(serializers.ModelSerializer):
    shop_details = ShopSerializer(source='shop', read_only=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = MeterReading
        fields = [
            'id', 'client_id', 'shop', 'shop_details', 'agent_name', 'value',
            'reading_type', 'reading_date', 'reading_time', 'meter_photo'
        ]
        extra_kwargs = {
            'shop': {'write_only': True}
        }
    
    def create(self, validated_data):
        """Create meter reading with idempotency for offline sync."""
        client_id = validated_data.get('client_id')
        if client_id:
            existing = MeterReading.objects.filter(client_id=client_id).first()
            if existing:
                return existing
        return super().create(validated_data)