# Views for inventory adjustment and history

from django.utils import timezone
from django.db.models import Sum, F, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication, BasicAuthentication

from stock.models import StockItem, StockLog
from shops.models import Shops
from stock.services import StockCalculationService
from hamu_backend.permissions import IsShopAgentOrDirector, FlexibleJWTAuthentication
from .inventory_serializers import InventoryAdjustmentSerializer

class InventoryAdjustmentView(APIView):
    """
    API endpoint for adjusting inventory.
    """
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsShopAgentOrDirector]

    def post(self, request):
        # Get shop_id from query parameters or request data
        shop_id = request.query_params.get('shop_id', request.data.get('shop_id'))
        
        if not shop_id:
            user = request.user
            if user.user_class != 'Director':
                shop_id = str(user.shop.id)
            else:
                return Response({"error": "shop_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add shop_id to request data for validation
        adjustment_data = request.data.copy()
        adjustment_data['shop_id'] = shop_id
        
        serializer = InventoryAdjustmentSerializer(data=adjustment_data)
        if serializer.is_valid():
            # Get validated data
            validated_data = serializer.validated_data
            
            try:
                # Get stock item
                stock_item = StockItem.objects.get(id=validated_data['id'])
                
                # Check if the item belongs to the specified shop
                if stock_item.shop.id != int(shop_id):
                    return Response(
                        {"error": "Stock item does not belong to this shop"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Get current stock level
                current_quantity = StockCalculationService.get_current_stock_level(stock_item)
                
                # Calculate the change to apply based on adjustment type
                if validated_data['adjustment_type'] == 'add':
                    quantity_change = validated_data['quantity']
                    new_quantity = current_quantity + quantity_change
                elif validated_data['adjustment_type'] == 'subtract':
                    quantity_change = -validated_data['quantity']
                    new_quantity = current_quantity + quantity_change
                    # Check if we have enough stock
                    if new_quantity < 0:
                        return Response(
                            {"error": f"Not enough stock. Current quantity is {current_quantity}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                elif validated_data['adjustment_type'] == 'set':
                    quantity_change = validated_data['quantity'] - current_quantity
                    new_quantity = validated_data['quantity']
                    
                # Create a stock log entry
                stock_log = StockLog(
                    stock_item=stock_item,
                    quantity_change=quantity_change,
                    notes=f"Manual adjustment: {validated_data['reason']}",
                    shop=stock_item.shop,
                    director_name=request.user.names,
                    log_date=timezone.now()
                )
                stock_log.save()
                
                # Return success response with updated quantities
                return Response({
                    "success": True,
                    "message": "Inventory adjusted successfully",
                    "previous_quantity": current_quantity,
                    "quantity_changed": quantity_change,
                    "new_quantity": new_quantity,
                    "stock_item": {
                        "id": stock_item.id,
                        "name": stock_item.item_name,
                        "type": stock_item.item_type
                    }
                })
                
            except StockItem.DoesNotExist:
                return Response(
                    {"error": "Stock item not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InventoryHistoryView(APIView):
    """
    API endpoint for retrieving inventory adjustment history.
    """
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsShopAgentOrDirector]

    def get(self, request):
        # Get parameters
        shop_id = request.query_params.get('shop_id')
        item_id = request.query_params.get('item_id')
        
        # If no shop_id provided and user is an agent, use their shop
        user = request.user
        if not shop_id and user.user_class != 'Director':
            shop_id = str(user.shop.id)
            
        if not shop_id and user.user_class == 'Director':
            return Response({"error": "shop_id parameter is required for directors"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Base query for stock logs
        query = StockLog.objects.filter(shop_id=shop_id).order_by('-log_date')
        
        # Filter by item_id if provided
        if item_id:
            query = query.filter(stock_item_id=item_id)
        
        # Get stock logs
        stock_logs = query.select_related('stock_item', 'shop')
        
        # If filtering by item_id, get the current and previous quantities
        if item_id:
            try:
                stock_item = StockItem.objects.get(id=item_id)
                current_quantity = StockCalculationService.get_current_stock_level(stock_item)
            except StockItem.DoesNotExist:
                return Response(
                    {"error": "Stock item not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            current_quantity = None
        
        # Format the response
        entries = []
        for log in stock_logs:
            entries.append({
                "id": log.id,
                "item_id": log.stock_item.id,
                "item_name": log.stock_item.item_name,
                "item_type": log.stock_item.item_type,
                "user": log.director_name,
                "timestamp": log.log_date.isoformat(),
                "previous_quantity": 0,  # This would require additional calculation
                "new_quantity": 0,       # This would require additional calculation
                "adjustment_type": "add" if log.quantity_change > 0 else "subtract" if log.quantity_change < 0 else "set",
                "quantity": abs(log.quantity_change),
                "reason": log.notes,
                "shop_name": log.shop.shopName
            })
        
        return Response({
            "entries": entries,
            "total_count": len(entries),
            "current_quantity": current_quantity
        })
