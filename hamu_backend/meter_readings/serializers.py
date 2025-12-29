from rest_framework import serializers
from .models import MeterReading
from shops.serializers import ShopSerializer
import base64
import uuid
from django.core.files.base import ContentFile


class MeterReadingSerializer(serializers.ModelSerializer):
    shop_details = ShopSerializer(source='shop', read_only=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)
    # Accept base64-encoded meter photo for offline sync support
    meter_photo_base64 = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    
    class Meta:
        model = MeterReading
        fields = [
            'id', 'client_id', 'shop', 'shop_details', 'agent_name', 'value',
            'reading_type', 'reading_date', 'reading_time', 'meter_photo', 'meter_photo_base64'
        ]
        extra_kwargs = {
            'shop': {'write_only': True},
            'meter_photo': {'required': False}  # Not required when using base64
        }
    
    def create(self, validated_data):
        """Create meter reading with idempotency for offline sync and base64 image support."""
        # Check for idempotency first
        client_id = validated_data.get('client_id')
        if client_id:
            existing = MeterReading.objects.filter(client_id=client_id).first()
            if existing:
                return existing
        
        # Handle base64 meter photo (from offline sync)
        meter_photo_base64 = validated_data.pop('meter_photo_base64', None)
        if meter_photo_base64 and not validated_data.get('meter_photo'):
            try:
                # Parse data URL format: data:image/jpeg;base64,/9j/4AAQ...
                if meter_photo_base64.startswith('data:'):
                    # Extract content type and base64 data
                    header, base64_data = meter_photo_base64.split(',', 1)
                    # Determine file extension from content type
                    content_type = header.split(':')[1].split(';')[0]
                    ext = content_type.split('/')[-1]
                    if ext == 'jpeg':
                        ext = 'jpg'
                else:
                    # Assume JPEG if no data URL format
                    base64_data = meter_photo_base64
                    ext = 'jpg'
                
                # Decode base64 to bytes
                image_data = base64.b64decode(base64_data)
                
                # Create a file name
                filename = f"meter_{uuid.uuid4().hex[:8]}.{ext}"
                
                # Create a ContentFile and assign to meter_photo field
                validated_data['meter_photo'] = ContentFile(image_data, name=filename)
                print(f"[Offline Sync] Decoded base64 meter photo: {filename}")
            except Exception as e:
                print(f"[Offline Sync] Failed to decode base64 meter photo: {e}")
                # Continue without the photo if decoding fails
        
        return super().create(validated_data)