from django.shortcuts import render
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Packages
from .serializers import PackageSerializer
from hamu_backend.permissions import IsShopAgentOrDirector


class PackageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for packages/products management.
    Directors can see and manage all packages across shops.
    Shop agents can only view packages from their shop.
    """
    serializer_class = PackageSerializer
    permission_classes = [IsShopAgentOrDirector]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['water_amount_label', 'bottle_type', 'description']
    ordering_fields = ['sale_type', 'price', 'water_amount_label']
    filterset_fields = ['shop', 'sale_type', 'bottle_type', 'water_amount_label']
    
    def get_queryset(self):
        user = self.request.user
        if user.user_class == 'Director':
            # Directors see all packages across all shops
            return Packages.objects.all().select_related('shop')
        else:
            # Agents only see packages from their shop
            return Packages.objects.filter(shop=user.shop).select_related('shop')
    
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
        Export all packages for offline caching.
        Returns all fields needed for creating sales/refills offline.
        """
        queryset = self.get_queryset()
        
        packages = []
        for pkg in queryset.select_related('shop'):
            packages.append({
                'id': pkg.id,
                'water_amount_label': pkg.water_amount_label,
                'bottle_type': pkg.bottle_type,
                'description': pkg.description,
                'price': float(pkg.price),
                'sale_type': pkg.sale_type,
                'shop': pkg.shop_id,
                'shop_details': {
                    'id': pkg.shop.id,
                    'shopName': pkg.shop.shopName,
                } if pkg.shop else None
            })
        
        return Response({
            'results': packages,
            'count': len(packages),
            'export_type': 'offline_cache'
        })
