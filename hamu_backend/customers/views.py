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
