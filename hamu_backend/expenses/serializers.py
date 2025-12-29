from rest_framework import serializers
from .models import Expenses
from shops.serializers import ShopSerializer
import base64
import uuid
from django.core.files.base import ContentFile


class ExpensesSerializer(serializers.ModelSerializer):
    shop_details = ShopSerializer(source='shop', read_only=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)
    # Accept base64-encoded receipt image for offline sync support
    receipt_base64 = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    
    class Meta:
        model = Expenses
        fields = [
            'id', 'client_id', 'shop', 'shop_details', 'description', 'cost',
            'receipt', 'receipt_base64', 'agent_name', 'created_at'
        ]
        extra_kwargs = {
            'shop': {'write_only': True},
            'receipt': {'required': False}  # Not required when using base64
        }
    
    def create(self, validated_data):
        """Create expense with idempotency for offline sync and base64 image support."""
        # Check for idempotency first
        client_id = validated_data.get('client_id')
        if client_id:
            existing = Expenses.objects.filter(client_id=client_id).first()
            if existing:
                return existing
        
        # Handle base64 receipt image (from offline sync)
        receipt_base64 = validated_data.pop('receipt_base64', None)
        if receipt_base64 and not validated_data.get('receipt'):
            try:
                # Parse data URL format: data:image/jpeg;base64,/9j/4AAQ...
                if receipt_base64.startswith('data:'):
                    # Extract content type and base64 data
                    header, base64_data = receipt_base64.split(',', 1)
                    # Determine file extension from content type
                    content_type = header.split(':')[1].split(';')[0]
                    ext = content_type.split('/')[-1]
                    if ext == 'jpeg':
                        ext = 'jpg'
                else:
                    # Assume JPEG if no data URL format
                    base64_data = receipt_base64
                    ext = 'jpg'
                
                # Decode base64 to bytes
                image_data = base64.b64decode(base64_data)
                
                # Create a file name
                filename = f"receipt_{uuid.uuid4().hex[:8]}.{ext}"
                
                # Create a ContentFile and assign to receipt field
                validated_data['receipt'] = ContentFile(image_data, name=filename)
                print(f"[Offline Sync] Decoded base64 receipt image: {filename}")
            except Exception as e:
                print(f"[Offline Sync] Failed to decode base64 receipt: {e}")
                # Continue without the receipt if decoding fails
        
        return super().create(validated_data)