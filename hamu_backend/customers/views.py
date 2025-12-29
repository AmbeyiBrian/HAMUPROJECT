from django.shortcuts import render
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customers
from .serializers import CustomerSerializer, CustomerInsightSerializer
from hamu_backend.permissions import IsShopAgentOrDirector


class CustomerViewSet(viewsets.ModelViewSet):
    """
    API endpoint for customers management.
    Directors can see and manage all customers across shops.
    Shop agents can only view and manage customers from their shop.
    """
    serializer_class = CustomerSerializer
    permission_classes = [IsShopAgentOrDirector]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['names', 'phone_number', 'apartment_name', 'room_number']
    ordering_fields = ['names', 'date_registered']
    filterset_fields = ['shop', 'apartment_name']
    
    def get_queryset(self):
        user = self.request.user
        if user.user_class == 'Director':
            # Directors see all customers across all shops
            return Customers.objects.all().select_related('shop')
        else:
            # Agents only see customers from their shop
            return Customers.objects.filter(shop=user.shop).select_related('shop')
    
    def perform_create(self, serializer):
        """Automatically set shop for agent users"""
        user = self.request.user
        if user.user_class != 'Director' and not serializer.validated_data.get('shop'):
            serializer.save(shop=user.shop)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'])
    def export_for_offline(self, request):
        """
        Export all customers for offline caching.
        Returns fields needed for offline customer detail pages.
        """
        queryset = self.get_queryset()
        
        customers = []
        for customer in queryset.select_related('shop').prefetch_related('refills', 'sales', 'credit_payments'):
            # Calculate loyalty info
            refills = customer.refills.all()
            refill_count = refills.count()
            free_refill_interval = getattr(customer.shop, 'freeRefillInterval', 10) if customer.shop else 10
            refill_quantities = sum(getattr(r, 'quantity', 1) or 1 for r in refills)
            free_refills = refills.filter(is_free=True).count()
            calculated_free = refill_quantities // free_refill_interval
            free_refills_redeemed = max(free_refills, calculated_free)
            paid_quantities = refill_quantities - free_refills_redeemed
            current_points = paid_quantities % free_refill_interval
            refills_until_free = free_refill_interval - current_points if current_points > 0 else free_refill_interval
            
            # Get last refill date
            last_refill = refills.order_by('-created_at').first()
            last_refill_date = last_refill.created_at.isoformat() if last_refill else None
            
            # Calculate credit balance
            # total_credit_owed = sum of CREDIT payment mode refills and sales
            total_credit_owed = 0
            credit_refills = refills.filter(payment_mode='CREDIT')
            for r in credit_refills:
                total_credit_owed += float(r.cost or 0)
            if hasattr(customer, 'sales'):
                credit_sales = customer.sales.filter(payment_mode='CREDIT')
                for s in credit_sales:
                    total_credit_owed += float(s.cost or 0)
            
            # total_repaid = sum of credit_payments
            total_repaid = 0
            if hasattr(customer, 'credit_payments'):
                for payment in customer.credit_payments.all():
                    total_repaid += float(payment.money_paid or 0)
            
            # credit_balance = positive means customer has balance to use
            # (if repaid more than owed, or received loyalty/refund credits)
            credit_balance = total_repaid - total_credit_owed
            
            customers.append({
                'id': customer.id,
                'names': customer.names,
                'phone_number': customer.phone_number,
                'apartment_name': customer.apartment_name,
                'room_number': customer.room_number,
                'date_registered': customer.date_registered.isoformat() if customer.date_registered else None,
                'last_refill_date': last_refill_date,
                'shop': customer.shop_id,
                'refill_count': refill_count,
                'credit_balance': credit_balance,  # Positive = customer has balance to use
                'loyalty': {
                    'current_points': current_points,
                    'refills_until_free': refills_until_free,
                    'free_refills_redeemed': free_refills_redeemed
                },
                'shop_details': {
                    'id': customer.shop.id,
                    'shopName': customer.shop.shopName,
                    'freeRefillInterval': customer.shop.freeRefillInterval,
                } if customer.shop else None
            })
        
        return Response({
            'results': customers,
            'count': len(customers),
            'export_type': 'offline_cache'
        })


class CustomerInsightViewSet(viewsets.ModelViewSet):
    """
    API endpoint for customer insights.
    Provides aggregated data and insights about customers.
    """
    serializer_class = CustomerInsightSerializer
    permission_classes = [IsShopAgentOrDirector]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['total_spent', 'last_order_date']
    filterset_fields = ['shop', 'apartment_name']
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to add debugging for customer details"""
        response = super().retrieve(request, *args, **kwargs)
        print(f"[DEBUG] Customer details sent to frontend: Credit={response.data.get('credit')}, Loyalty={response.data.get('loyalty')}")
        return response
    
    def get_queryset(self):
        user = self.request.user
        if user.user_class == 'Director':
            # Directors see insights for all customers across all shops
            return Customers.objects.all().select_related('shop')
        else:
            # Agents only see insights for customers from their shop
            return Customers.objects.filter(shop=user.shop).select_related('shop')


class CustomerInsightsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for customer insights with enhanced data for the frontend.
    This viewset is read-only and includes additional calculated fields.
    """
    serializer_class = CustomerInsightSerializer
    permission_classes = [IsShopAgentOrDirector]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['names', 'phone_number', 'apartment_name', 'room_number']
    ordering_fields = ['names', 'date_registered']
    filterset_fields = ['shop', 'apartment_name']
    
    def get_queryset(self):
        user = self.request.user
        
        # Get shop_id from query params
        shop_id = self.request.query_params.get('shop_id')
        
        # Base query with necessary related objects
        queryset = Customers.objects.all().select_related('shop')
        
        # Apply shop filtering
        if shop_id and shop_id.lower() != 'all':
            try:
                shop_id_int = int(shop_id)
                queryset = queryset.filter(shop_id=shop_id_int)
            except ValueError:
                # Invalid shop_id, but don't fail
                pass
        elif user.user_class != 'Director':
            # For non-directors without explicit shop_id, filter by user's shop
            queryset = queryset.filter(shop=user.shop)
        
        return queryset
