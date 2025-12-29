from django.shortcuts import render
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from django.db.models import Sum, Count, Avg, F, Q, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from hamu_backend.permissions import IsShopAgentOrDirector, FlexibleJWTAuthentication
from sales.models import Sales
from refills.models import Refills
from customers.models import Customers
from expenses.models import Expenses
from shops.models import Shops
from credits.models import Credits
from stock.models import StockItem, StockLog
from meter_readings.models import MeterReading
from stock.services import StockCalculationService
from .serializers import (
    InventoryAdjustmentSerializer,
    StockItemAnalyticsSerializer,
    StockLogAnalyticsSerializer,
    InventoryHistoryResponseSerializer
)


# Analytics ViewSet for router registration
class AnalyticsViewSet(viewsets.ViewSet):
    """
    API endpoint for analytics data.
    """
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsShopAgentOrDirector]
    
    @action(detail=False, methods=['get'])
    def sales(self, request):
        """Get sales analytics data"""
        # Get time range from query parameters
        time_range = request.query_params.get('time_range', 'month')
        
        # Get shop_id from either query params, data, or 'all' as default
        shop_id = request.query_params.get('shop_id')
        
        # Additional logging to debug parameter handling
        print(f"Sales Analytics - Shop ID from query params: {shop_id}")
        print(f"Sales Analytics - All query params: {request.query_params}")
        
        # If shop_id is None, try to get it from data
        if shop_id is None:
            shop_id = request.data.get('shop_id', 'all')
            print(f"Sales Analytics - Shop ID from request data: {shop_id}")        # Calculate date range based on time_range parameter
        end_date = timezone.now()
        
        # Check if custom date range is provided
        if time_range == 'custom':
            # Get start and end dates from query parameters
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            # Log the received custom date range
            print(f"Custom date range received - start_date: {start_date_str}, end_date: {end_date_str}")
            
            if start_date_str and end_date_str:
                try:
                    # Parse the date strings (format: YYYY-MM-DD)
                    start_date_parsed = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    end_date_parsed = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    
                    # Convert to timezone-aware datetimes
                    start_date = timezone.make_aware(datetime.combine(start_date_parsed, datetime.min.time()))
                    end_date = timezone.make_aware(datetime.combine(end_date_parsed, datetime.max.time()))
                      # For comparison, use a more logical previous period
                    # Check if the custom date range aligns with a calendar year, quarter or month
                    today = end_date_parsed
                    start_of_year = datetime(today.year, 1, 1).date()
                    is_year_to_date = (start_date_parsed == start_of_year)
                    
                    # Check if it's a month-to-date
                    start_of_month = datetime(today.year, today.month, 1).date()
                    is_month_to_date = (start_date_parsed == start_of_month)
                    
                    # Check if it's a quarter-to-date
                    current_month = today.month
                    current_quarter = (current_month - 1) // 3 + 1
                    quarter_start_month = (current_quarter - 1) * 3 + 1
                    start_of_quarter = datetime(today.year, quarter_start_month, 1).date()
                    is_quarter_to_date = (start_date_parsed == start_of_quarter)
                    
                    # Use the appropriate comparison period based on the range type
                    if is_year_to_date:
                        # If it's a year-to-date range, compare with previous year
                        previous_start_date = timezone.make_aware(datetime.combine(
                            datetime(today.year - 1, start_date_parsed.month, start_date_parsed.day).date(),
                            datetime.min.time()
                        ))
                        previous_end_date = timezone.make_aware(datetime.combine(
                            datetime(today.year - 1, end_date_parsed.month, min(end_date_parsed.day, 28 if end_date_parsed.month == 2 else 30)).date(),
                            datetime.max.time()
                        ))
                    elif is_month_to_date:
                        # If it's a month-to-date range, compare with previous month
                        if start_date_parsed.month == 1:  # January
                            prev_month_year = today.year - 1
                            prev_month = 12
                        else:
                            prev_month_year = today.year
                            prev_month = start_date_parsed.month - 1
                            
                        previous_start_date = timezone.make_aware(datetime.combine(
                            datetime(prev_month_year, prev_month, 1).date(),
                            datetime.min.time()
                        ))
                        
                        # Handle varying month lengths properly
                        last_day_of_prev_month = min(end_date_parsed.day, 28 if prev_month == 2 else 30 if prev_month in [4, 6, 9, 11] else 31)
                        previous_end_date = timezone.make_aware(datetime.combine(
                            datetime(prev_month_year, prev_month, last_day_of_prev_month).date(),
                            datetime.max.time()
                        ))
                    elif is_quarter_to_date:
                        # If it's a quarter-to-date range, compare with previous quarter
                        if quarter_start_month == 1:  # Q1
                            prev_quarter_year = today.year - 1
                            prev_quarter_month = 10  # October of previous year (Q4)
                        else:
                            prev_quarter_year = today.year
                            prev_quarter_month = quarter_start_month - 3
                            
                        previous_start_date = timezone.make_aware(datetime.combine(
                            datetime(prev_quarter_year, prev_quarter_month, 1).date(),
                            datetime.min.time()
                        ))
                        
                        # For the end date, calculate days in quarter
                        days_in_range = (end_date_parsed - start_date_parsed).days
                        previous_end_date = previous_start_date + timedelta(days=days_in_range, seconds=86399)
                    else:
                        # For other custom ranges, use same length previous period
                        period_length = (end_date_parsed - start_date_parsed).days + 1
                        previous_end_date = start_date - timedelta(seconds=1)
                        previous_start_date = previous_end_date - timedelta(days=period_length) + timedelta(seconds=1)
                    
                    print(f"Using custom date range: {start_date} to {end_date}")
                    print(f"Previous period: {previous_start_date} to {previous_end_date}")
                except ValueError as e:
                    # Fallback to default if date parsing fails
                    print(f"Error parsing custom dates: {e}")
                    today = end_date.date()
                    first_day_of_month = today.replace(day=1)
                    start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
                    previous_start_date = start_date - timedelta(days=30)
                    previous_end_date = start_date
            else:
                # Fallback to default if dates not provided
                today = end_date.date()
                first_day_of_month = today.replace(day=1)
                start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
                previous_start_date = start_date - timedelta(days=30)
                previous_end_date = start_date
        elif time_range == 'day':
            # Set start_date to the beginning of today (midnight)
            today = end_date.date()
            start_date = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            # Previous day for comparison
            previous_day = today - timedelta(days=1)
            previous_start_date = timezone.make_aware(datetime.combine(previous_day, datetime.min.time()))
            previous_end_date = start_date
        elif time_range == 'week':
            # Get current weekday (0 = Monday in Python's datetime)
            today = end_date.date()
            # Find the first day of the current week (Monday)
            current_weekday = today.weekday()
            days_to_subtract = current_weekday  # 0 for Monday, 1 for Tuesday, etc.
            start_of_week = today - timedelta(days=days_to_subtract)
            start_date = timezone.make_aware(datetime.combine(start_of_week, datetime.min.time()))
            # Previous week
            previous_week_end = start_date - timedelta(seconds=1)
            previous_week_start = previous_week_end - timedelta(days=6)
            previous_start_date = previous_week_start
            previous_end_date = previous_week_end
        elif time_range == 'month':
            # Set to first day of current month
            today = end_date.date()
            first_day_of_month = today.replace(day=1)
            start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
            # Previous month
            if first_day_of_month.month == 1:  # January
                prev_month = datetime(first_day_of_month.year - 1, 12, 1)
            else:
                prev_month = datetime(first_day_of_month.year, first_day_of_month.month - 1, 1)
            prev_month_end = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time())) - timedelta(seconds=1)
            previous_start_date = timezone.make_aware(prev_month)
            previous_end_date = prev_month_end
        elif time_range == 'quarter':
            # Determine current quarter
            today = end_date.date()
            current_month = today.month
            current_quarter = (current_month - 1) // 3 + 1
            quarter_start_month = (current_quarter - 1) * 3 + 1
            # First day of the current quarter
            first_day_of_quarter = datetime(today.year, quarter_start_month, 1).date()
            start_date = timezone.make_aware(datetime.combine(first_day_of_quarter, datetime.min.time()))
            # Previous quarter
            if quarter_start_month == 1:  # Q1
                prev_quarter_year = today.year - 1
                prev_quarter_month = 10  # October of previous year (Q4)
            else:
                prev_quarter_year = today.year
                prev_quarter_month = quarter_start_month - 3
            prev_quarter_start = datetime(prev_quarter_year, prev_quarter_month, 1).date()
            prev_quarter_end = timezone.make_aware(datetime.combine(first_day_of_quarter, datetime.min.time())) - timedelta(seconds=1)
            previous_start_date = timezone.make_aware(datetime.combine(prev_quarter_start, datetime.min.time()))
            previous_end_date = prev_quarter_end
        elif time_range == 'year':
            # Set to first day of current year
            today = end_date.date()
            first_day_of_year = datetime(today.year, 1, 1).date()
            start_date = timezone.make_aware(datetime.combine(first_day_of_year, datetime.min.time()))
            # Previous year
            prev_year_start = datetime(today.year - 1, 1, 1).date()
            prev_year_end = datetime(today.year, 1, 1).date() - timedelta(days=1)
            previous_start_date = timezone.make_aware(datetime.combine(prev_year_start, datetime.min.time()))
            previous_end_date = timezone.make_aware(datetime.combine(prev_year_end, datetime.max.time()))
        else:
            # Default to current month if time_range not recognized
            today = end_date.date()
            first_day_of_month = today.replace(day=1)
            start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
            # Previous month for comparison
            if first_day_of_month.month == 1:  # January
                prev_month = datetime(first_day_of_month.year - 1, 12, 1)
            else:
                prev_month = datetime(first_day_of_month.year, first_day_of_month.month - 1, 1)
            prev_month_end = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time())) - timedelta(seconds=1)
            previous_start_date = timezone.make_aware(prev_month)
            previous_end_date = prev_month_end

        # Filter sales by date range
        sales_query = Sales.objects.filter(sold_at__gte=start_date, sold_at__lte=end_date)
        refills_query = Refills.objects.filter(created_at__gte=start_date, created_at__lte=end_date)

        # Filter by shop if specified
        if shop_id and shop_id != 'all':
            sales_query = sales_query.filter(shop_id=shop_id)
            refills_query = refills_query.filter(shop_id=shop_id)

        # Calculate total revenue
        sales_revenue = sales_query.aggregate(total=Sum('cost'))['total'] or 0
        refill_revenue = refills_query.aggregate(total=Sum('cost'))['total'] or 0
        total_revenue = sales_revenue + refill_revenue

        # Calculate sales counts
        sales_count = sales_query.count()
        refill_count = refills_query.count()
        total_sales_count = sales_count + refill_count

        # Calculate previous period data for percentage changes
        previous_sales_query = Sales.objects.filter(sold_at__gte=previous_start_date, sold_at__lte=previous_end_date)
        previous_refills_query = Refills.objects.filter(created_at__gte=previous_start_date, created_at__lte=previous_end_date)

        # Filter by shop if specified
        if shop_id and shop_id != 'all':
            previous_sales_query = previous_sales_query.filter(shop_id=shop_id)
            previous_refills_query = previous_refills_query.filter(shop_id=shop_id)

        # Calculate previous period revenue
        previous_sales_revenue = previous_sales_query.aggregate(total=Sum('cost'))['total'] or 0
        previous_refill_revenue = previous_refills_query.aggregate(total=Sum('cost'))['total'] or 0
        previous_total_revenue = previous_sales_revenue + previous_refill_revenue

        # Calculate previous period sales counts
        previous_sales_count = previous_sales_query.count()
        previous_refill_count = previous_refills_query.count()
        previous_total_sales_count = previous_sales_count + previous_refill_count

        # Calculate percentage changes
        revenue_change_percentage = 0
        sales_count_change_percentage = 0
        
        if previous_total_revenue > 0:
            revenue_change_percentage = round(((total_revenue - previous_total_revenue) / previous_total_revenue) * 100, 1)
        
        if previous_total_sales_count > 0:
            sales_count_change_percentage = round(((total_sales_count - previous_total_sales_count) / previous_total_sales_count) * 100, 1)

        # Calculate sales by payment mode
        sales_by_payment_mode = {
            'MPESA': (sales_query.filter(payment_mode='MPESA').aggregate(total=Sum('cost'))['total'] or 0) +
                    (refills_query.filter(payment_mode='MPESA').aggregate(total=Sum('cost'))['total'] or 0),
            'CASH': (sales_query.filter(payment_mode='CASH').aggregate(total=Sum('cost'))['total'] or 0) +
                   (refills_query.filter(payment_mode='CASH').aggregate(total=Sum('cost'))['total'] or 0),
            'CREDIT': (sales_query.filter(payment_mode='CREDIT').aggregate(total=Sum('cost'))['total'] or 0) +
                     (refills_query.filter(payment_mode='CREDIT').aggregate(total=Sum('cost'))['total'] or 0)
        }

        # Calculate sales by shop
        sales_by_shop = {}
        shops = Shops.objects.all()
        for shop in shops:
            shop_sales = sales_query.filter(shop=shop).aggregate(total=Sum('cost'))['total'] or 0
            shop_refills = refills_query.filter(shop=shop).aggregate(total=Sum('cost'))['total'] or 0
            sales_by_shop[shop.shopName] = shop_sales + shop_refills

        # Calculate daily/weekly/monthly sales for trend analysis
        if time_range == 'day':
            # For a day, get hourly breakdown
            sales_trend = []
            for hour in range(24):
                hour_start = start_date.replace(hour=hour, minute=0, second=0)
                hour_end = start_date.replace(hour=hour, minute=59, second=59)
                hour_sales = sales_query.filter(sold_at__gte=hour_start, sold_at__lte=hour_end)
                hour_refills = refills_query.filter(created_at__gte=hour_start, created_at__lte=hour_end)
                hour_revenue = (hour_sales.aggregate(total=Sum('cost'))['total'] or 0) + (hour_refills.aggregate(total=Sum('cost'))['total'] or 0)
                hour_count = hour_sales.count() + hour_refills.count()
                sales_trend.append({
                    'date': hour_start.strftime('%H:%M'),
                    'revenue': hour_revenue,
                    'count': hour_count
                })
        elif time_range == 'week':
            # For a week, get daily breakdown
            sales_trend = []
            for i in range(7):
                day_date = end_date - timedelta(days=6-i)
                day_start = day_date.replace(hour=0, minute=0, second=0)
                day_end = day_date.replace(hour=23, minute=59, second=59)
                day_sales = sales_query.filter(sold_at__gte=day_start, sold_at__lte=day_end)
                day_refills = refills_query.filter(created_at__gte=day_start, created_at__lte=day_end)
                day_revenue = (day_sales.aggregate(total=Sum('cost'))['total'] or 0) + (day_refills.aggregate(total=Sum('cost'))['total'] or 0)
                day_count = day_sales.count() + day_refills.count()
                sales_trend.append({
                    'date': day_date.strftime('%Y-%m-%d'),
                    'revenue': day_revenue,
                    'count': day_count
                })
        else:
            # For month/quarter/year, get weekly breakdown
            sales_trend = []
            num_weeks = 4  # For month
            if time_range == 'quarter':
                num_weeks = 12
            elif time_range == 'year':
                num_weeks = 52
                
            for i in range(num_weeks):
                week_end = end_date - timedelta(days=7*i)
                week_start = week_end - timedelta(days=6)
                week_sales = sales_query.filter(sold_at__gte=week_start, sold_at__lte=week_end)
                week_refills = refills_query.filter(created_at__gte=week_start, created_at__lte=week_end)
                week_revenue = (week_sales.aggregate(total=Sum('cost'))['total'] or 0) + (week_refills.aggregate(total=Sum('cost'))['total'] or 0)
                week_count = week_sales.count() + week_refills.count()
                sales_trend.append({
                    'date': f"{week_start.strftime('%m/%d')} - {week_end.strftime('%m/%d')}",
                    'revenue': week_revenue,
                    'count': week_count
                })
            # Reverse to get chronological order
            sales_trend.reverse()

        # OPTIMIZED: Get top selling packages using aggregation
        # Aggregate sales by package
        sales_by_pkg = sales_query.values('package__description').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('cost')
        )
        
        # Aggregate refills by package  
        refills_by_pkg = refills_query.values('package__description').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('cost')
        )
        
        # Combine into dictionary
        sales_by_package = {}
        for item in sales_by_pkg:
            name = item['package__description']
            sales_by_package[name] = {
                'sales': item['total_qty'] or 0,
                'revenue': float(item['total_revenue'] or 0)
            }
        
        for item in refills_by_pkg:
            name = item['package__description']
            if name in sales_by_package:
                sales_by_package[name]['sales'] += item['total_qty'] or 0
                sales_by_package[name]['revenue'] += float(item['total_revenue'] or 0)
            else:
                sales_by_package[name] = {
                    'sales': item['total_qty'] or 0,
                    'revenue': float(item['total_revenue'] or 0)
                }
        
        # Convert to list and sort by revenue
        top_packages = [
            {'name': name, 'sales': data['sales'], 'revenue': data['revenue']}
            for name, data in sales_by_package.items()
        ]
        top_packages.sort(key=lambda x: x['revenue'], reverse=True)
        top_packages = top_packages[:5]  # Limit to top 5
        
        response_data = {
            'period': time_range,
            'total_revenue': total_revenue,
            'refill_revenue': refill_revenue,
            'bottle_sales_revenue': sales_revenue,
            'total_sales_count': total_sales_count,
            'refill_count': refill_count,
            'bottle_sales_count': sales_count,
            'sales_by_payment_mode': sales_by_payment_mode,
            'sales_by_shop': sales_by_shop,
            'daily_sales': sales_trend,
            'top_packages': top_packages,
            'revenue_change_percentage': revenue_change_percentage,
            'sales_count_change_percentage': sales_count_change_percentage
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'])
    def customers(self, request):
        """Get customer analytics data - OPTIMIZED VERSION with time filtering"""
        from django.db.models import Max, Count, Avg
        
        # Get shop_id from query params
        shop_id = request.query_params.get('shop_id')
        if shop_id is None:
            shop_id = request.data.get('shop_id', 'all')
        
        # Get time_range and calculate date range
        time_range = request.query_params.get('time_range', 'month')
        end_date = timezone.now()
        
        # Calculate date range based on time_range parameter
        if time_range == 'custom':
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            if start_date_str and end_date_str:
                try:
                    start_date_parsed = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    end_date_parsed = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    start_date = timezone.make_aware(datetime.combine(start_date_parsed, datetime.min.time()))
                    end_date = timezone.make_aware(datetime.combine(end_date_parsed, datetime.max.time()))
                except ValueError:
                    start_date = timezone.now() - timedelta(days=30)
            else:
                start_date = timezone.now() - timedelta(days=30)
        elif time_range == 'day':
            start_date = timezone.make_aware(datetime.combine(end_date.date(), datetime.min.time()))
        elif time_range == 'week':
            today = end_date.date()
            start_of_week = today - timedelta(days=today.weekday())
            start_date = timezone.make_aware(datetime.combine(start_of_week, datetime.min.time()))
        elif time_range == 'year':
            first_day_of_year = datetime(end_date.year, 1, 1).date()
            start_date = timezone.make_aware(datetime.combine(first_day_of_year, datetime.min.time()))
        else:  # month
            first_day_of_month = end_date.date().replace(day=1)
            start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
        
        # Base customer query
        customers_query = Customers.objects.all()
        
        # Filter by shop if specified
        if shop_id and shop_id != 'all':
            try:
                if str(shop_id).isdigit():
                    customers_query = customers_query.filter(shop_id=int(shop_id))
                else:
                    customers_query = customers_query.filter(shop_id=shop_id)
            except Exception as e:
                print(f"Error filtering customers by shop_id: {e}")
            
        # Calculate total customers
        total_customers = customers_query.count()
        
        # Calculate new customers IN THE SELECTED PERIOD
        new_customers = customers_query.filter(
            date_registered__gte=start_date,
            date_registered__lte=end_date
        ).count()
        
        # OPTIMIZED: Calculate active customers IN THE SELECTED PERIOD
        refills_query = Refills.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        if shop_id and shop_id != 'all':
            refills_query = refills_query.filter(shop_id=shop_id)
        active_customers = refills_query.values('customer_id').distinct().count()
        
        # Calculate loyalty redemptions IN THE SELECTED PERIOD
        loyalty_redemptions = refills_query.filter(is_free=True).count()
        
        # OPTIMIZED: Skip avg_time_between_refills calculation (too expensive)
        # Use a simplified estimate based on total refills / active customers
        total_refills = Refills.objects.filter(customer__in=customers_query).count()
        avg_time_between_refills = 14  # Default estimate
        if active_customers > 0 and total_refills > active_customers:
            # Rough estimate: 30 days / (refills per customer in 30 days)
            refills_per_active = total_refills / max(active_customers, 1)
            avg_time_between_refills = max(7, min(30, int(30 / refills_per_active)))
        
        # Calculate credits outstanding
        credit_sales = Sales.objects.filter(payment_mode='CREDIT')
        credit_refills = Refills.objects.filter(payment_mode='CREDIT')
        
        if shop_id and shop_id != 'all':
            credit_sales = credit_sales.filter(shop_id=shop_id)
            credit_refills = credit_refills.filter(shop_id=shop_id)
            
        credits_given = (credit_sales.aggregate(total=Sum('cost'))['total'] or 0) + \
                        (credit_refills.aggregate(total=Sum('cost'))['total'] or 0)
        
        credits_query = Credits.objects.all()
        if shop_id and shop_id != 'all':
            credits_query = credits_query.filter(shop_id=shop_id)
        credits_repaid = credits_query.aggregate(total=Sum('money_paid'))['total'] or 0
        credits_outstanding = credits_given - credits_repaid
        
        # OPTIMIZED: Customer growth - simplified to reduce queries
        customer_growth = []
        now = timezone.now()
        for i in range(4):
            month_offset = i
            month_date = now - timedelta(days=30 * month_offset)
            month_name = month_date.strftime('%b')
            month_customers = customers_query.filter(date_registered__lt=month_date).count()
            customer_growth.insert(0, {
                'month': month_name,
                'customers': month_customers
            })
        
        # OPTIMIZED: Customer activity levels using annotations
        very_active_date = timezone.now() - timedelta(days=30)
        active_date = timezone.now() - timedelta(days=60)
        irregular_date = timezone.now() - timedelta(days=90)
        
        # Annotate customers with their last refill date
        customers_with_refills = customers_query.annotate(
            last_refill_date=Max('refills__created_at')
        )
        
        very_active = customers_with_refills.filter(last_refill_date__gte=very_active_date).count()
        active = customers_with_refills.filter(
            last_refill_date__lt=very_active_date,
            last_refill_date__gte=active_date
        ).count()
        irregular = customers_with_refills.filter(
            last_refill_date__lt=active_date,
            last_refill_date__gte=irregular_date
        ).count()
        inactive = customers_with_refills.filter(
            Q(last_refill_date__lt=irregular_date) | Q(last_refill_date__isnull=True)
        ).count()
                
        customer_activity = {
            'Very Active': very_active,
            'Active': active,
            'Irregular': irregular,
            'Inactive': inactive
        }
        
        # OPTIMIZED: Loyalty metrics - simplified
        average_refills_per_customer = round(total_refills / total_customers, 1) if total_customers > 0 else 0
        
        this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        redeemed_this_month = Refills.objects.filter(
            customer__in=customers_query,
            is_free=True,
            created_at__gte=this_month_start
        ).values('customer').distinct().count()
        
        # Skip eligible_for_free_refill calculation (too expensive)
        loyalty_metrics = {
            'eligible_for_free_refill': 0,  # Would need expensive query
            'redeemed_this_month': redeemed_this_month,
            'average_refills_per_customer': average_refills_per_customer
        }
        
        # Credit analysis
        credit_customers = set(credit_sales.values_list('customer_id', flat=True)).union(
            set(credit_refills.values_list('customer_id', flat=True))
        )
        credit_customers_count = len(credit_customers)
        avg_credit_per_customer = round(credits_outstanding / credit_customers_count, 2) if credit_customers_count > 0 else 0
        
        credit_analysis = {
            'total_credit_given': credits_given,
            'total_repaid': credits_repaid,
            'credit_customers': credit_customers_count,
            'avg_credit_per_customer': avg_credit_per_customer
        }
        
        # TOP CUSTOMERS IN THE SELECTED PERIOD - using aggregation on filtered querysets
        from django.db.models import DecimalField
        
        # Get sales in period by customer
        sales_in_period = Sales.objects.filter(
            sold_at__gte=start_date,
            sold_at__lte=end_date
        )
        if shop_id and shop_id != 'all':
            sales_in_period = sales_in_period.filter(shop_id=shop_id)
        
        sales_by_customer = sales_in_period.values('customer_id').annotate(
            total=Coalesce(Sum('cost'), Value(Decimal('0')), output_field=DecimalField()),
            count=Count('id')
        )
        
        # Get refills in period by customer
        refills_in_period = Refills.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        if shop_id and shop_id != 'all':
            refills_in_period = refills_in_period.filter(shop_id=shop_id)
        
        refills_by_customer = refills_in_period.values('customer_id').annotate(
            total=Coalesce(Sum('cost'), Value(Decimal('0')), output_field=DecimalField()),
            count=Count('id')
        )
        
        # Combine sales and refills by customer
        customer_spending = {}
        for item in sales_by_customer:
            if item['customer_id']:
                customer_spending[item['customer_id']] = {
                    'sales_total': float(item['total'] or 0),
                    'sales_count': item['count'],
                    'refills_total': 0,
                    'refills_count': 0
                }
        
        for item in refills_by_customer:
            if item['customer_id']:
                if item['customer_id'] in customer_spending:
                    customer_spending[item['customer_id']]['refills_total'] = float(item['total'] or 0)
                    customer_spending[item['customer_id']]['refills_count'] = item['count']
                else:
                    customer_spending[item['customer_id']] = {
                        'sales_total': 0,
                        'sales_count': 0,
                        'refills_total': float(item['total'] or 0),
                        'refills_count': item['count']
                    }
        
        # Calculate total and sort
        for cid, data in customer_spending.items():
            data['total_spent'] = data['sales_total'] + data['refills_total']
        
        sorted_customers = sorted(customer_spending.items(), key=lambda x: x[1]['total_spent'], reverse=True)[:10]
        
        # Get customer details
        top_customer_ids = [cid for cid, _ in sorted_customers]
        customer_details = {c.id: c for c in Customers.objects.filter(id__in=top_customer_ids)}
        
        top_customers = [
            {
                'id': cid,
                'name': customer_details[cid].names if cid in customer_details else 'Unknown',
                'phone': customer_details[cid].phone_number if cid in customer_details else '',
                'refills': data['refills_count'],
                'purchases': data['sales_count'],
                'total_spent': data['total_spent']
            }
            for cid, data in sorted_customers if cid in customer_details
        ]
        
        response_data = {
            'total_customers': total_customers,
            'active_customers': active_customers,
            'new_customers': new_customers,
            'loyalty_redemptions': loyalty_redemptions,
            'avg_time_between_refills': avg_time_between_refills,
            'credits_outstanding': credits_outstanding,
            'customer_growth': customer_growth,
            'customer_activity': customer_activity,
            'loyalty_metrics': loyalty_metrics,
            'credit_analysis': credit_analysis,
            'top_customers': top_customers
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'])
    def inventory(self, request):
        """Get inventory analytics data"""
        # Get shop_id from either query params, data, or 'all' as default
        shop_id = request.query_params.get('shop_id')
        
        # Additional logging to debug parameter handling
        print(f"Shop ID from query params: {shop_id}")
        print(f"All query params: {request.query_params}")
        
        # If shop_id is None, try to get it from data
        if shop_id is None:
            shop_id = request.data.get('shop_id', 'all')
            print(f"Shop ID from request data: {shop_id}")
        
        # Base queries
        stock_items_query = StockItem.objects.all()
        
        # Improved filtering logic
        if shop_id and shop_id != 'all':
            try:
                # Try parsing as integer if it's a numeric string
                if shop_id.isdigit():
                    shop_id_int = int(shop_id)
                    stock_items_query = stock_items_query.filter(shop_id=shop_id_int)
                else:
                    # If not numeric, use as is (could be a slug or name)
                    stock_items_query = stock_items_query.filter(shop_id=shop_id)
                print(f"Filtered query with shop_id: {shop_id}")
            except Exception as e:
                print(f"Error filtering by shop_id: {e}")
                # Continue with unfiltered query if there's an error
        
        # Get all stock items with current quantities
        stock_items = []
        low_stock_items = 0
        total_stock_items = 0
        
        for item in stock_items_query:
            quantity = StockCalculationService.get_current_stock_level(item)
            
            # Use the threshold and reorder_point fields from the stock item
            if quantity <= item.threshold:
                low_stock_items += 1
                
            total_stock_items += quantity
                
            stock_items.append({
                'id': item.id,
                'name': item.item_name,
                'type': item.item_type,
                'quantity': quantity,
                'threshold': item.threshold,
                'reorder_point': item.reorder_point
            })
            
        # Calculate water consumption from meter readings
        water_consumption = 0
        water_wastage = 0
        
        # Get meter readings from the last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        meter_readings_query = MeterReading.objects.filter(reading_date__gte=seven_days_ago)
        
        if shop_id and shop_id != 'all':
            meter_readings_query = meter_readings_query.filter(shop_id=shop_id)
            
        # Group by shop and reading_type to calculate differences
        water_consumption_trends = []
        
        # OPTIMIZED: Calculate total water consumption using aggregation
        refills_query = Refills.objects.filter(created_at__gte=seven_days_ago)
        if shop_id and shop_id != 'all':
            refills_query = refills_query.filter(shop_id=shop_id)
        
        # Use refill count * average water amount (20L standard) as estimate
        total_refill_qty = refills_query.aggregate(total=Sum('quantity'))['total'] or 0
        water_consumption = total_refill_qty * 20  # Assume 20L per refill as average
            
        # Estimate water wastage (5% of consumption for demo)
        water_wastage = round(water_consumption * 0.05)
        
        # OPTIMIZED: Generate daily water consumption using aggregation
        for i in range(7):
            day_date = timezone.now().date() - timedelta(days=6-i)
            day_qty = refills_query.filter(created_at__date=day_date).aggregate(
                total=Sum('quantity')
            )['total'] or 0
            day_consumption = day_qty * 20  # Assume 20L average
                
            water_consumption_trends.append({
                'date': day_date.strftime('%Y-%m-%d'),
                'consumption': day_consumption
            })
            
        # OPTIMIZED: Calculate stock movements using aggregated query
        from django.db.models.functions import Concat
        from django.db.models import Case, When
        
        stock_logs_query = StockLog.objects.filter(log_date__gte=seven_days_ago)
        if shop_id and shop_id != 'all':
            stock_logs_query = stock_logs_query.filter(stock_item__shop_id=shop_id)
        
        # Aggregate by stock item
        stock_movements_data = stock_logs_query.values(
            'stock_item__item_name', 
            'stock_item__item_type'
        ).annotate(
            added=Coalesce(Sum(Case(
                When(quantity_change__gt=0, then='quantity_change'),
                default=Value(0)
            )), Value(0)),
            removed=Coalesce(Sum(Case(
                When(quantity_change__lt=0, then='quantity_change'),
                default=Value(0)
            )), Value(0))
        )
        
        stock_movements = []
        for item in stock_movements_data:
            added = item['added'] or 0
            removed = abs(item['removed'] or 0)
            net = added - removed
            if added > 0 or removed > 0:
                stock_movements.append({
                    'item': f"{item['stock_item__item_name']} {item['stock_item__item_type']}",
                    'added': added,
                    'removed': removed,
                    'net': net
                })
        
        # Sort by absolute net change
        stock_movements.sort(key=lambda x: abs(x['net']), reverse=True)
        stock_movements = stock_movements[:5]  # Limit to top 5
        
        response_data = {
            'total_stock_items': total_stock_items,
            'low_stock_items': low_stock_items,
            'water_consumption': water_consumption,
            'water_wastage': water_wastage,
            'stock_items': stock_items,
            'water_consumption_trends': water_consumption_trends,
            'stock_movements': stock_movements
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'])
    def financial(self, request):
        """Get financial analytics data"""
        # Get time range from query parameters
        time_range = request.query_params.get('time_range', 'month')
        
        # Get shop_id from either query params, data, or 'all' as default
        shop_id = request.query_params.get('shop_id')
        
        # Additional logging to debug parameter handling
        print(f"Financial Analytics - Shop ID from query params: {shop_id}")
        print(f"Financial Analytics - All query params: {request.query_params}")
        
        # If shop_id is None, try to get it from data
        if shop_id is None:
            shop_id = request.data.get('shop_id', 'all')
            print(f"Financial Analytics - Shop ID from request data: {shop_id}")        # Calculate date range based on time_range parameter
        end_date = timezone.now()
        
        # Check if custom date range is provided
        if time_range == 'custom':
            # Get start and end dates from query parameters
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            # Log the received custom date range
            print(f"Financial Analytics - Custom date range received - start_date: {start_date_str}, end_date: {end_date_str}")
            
            if start_date_str and end_date_str:
                try:
                    # Parse the date strings (format: YYYY-MM-DD)
                    start_date_parsed = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    end_date_parsed = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    
                    # Convert to timezone-aware datetimes
                    start_date = timezone.make_aware(datetime.combine(start_date_parsed, datetime.min.time()))                    
                    end_date = timezone.make_aware(datetime.combine(end_date_parsed, datetime.max.time()))
                    
                    # For comparison, use a more logical previous period
                    # Check if the custom date range aligns with a calendar year, quarter or month
                    today = end_date_parsed
                    start_of_year = datetime(today.year, 1, 1).date()
                    is_year_to_date = (start_date_parsed == start_of_year)
                    
                    # Check if it's a month-to-date
                    start_of_month = datetime(today.year, today.month, 1).date()
                    is_month_to_date = (start_date_parsed == start_of_month)
                    
                    # Check if it's a quarter-to-date
                    current_month = today.month
                    current_quarter = (current_month - 1) // 3 + 1
                    quarter_start_month = (current_quarter - 1) * 3 + 1
                    start_of_quarter = datetime(today.year, quarter_start_month, 1).date()
                    is_quarter_to_date = (start_date_parsed == start_of_quarter)
                    
                    # Also track previous period data for comparison
                    if is_year_to_date:
                        # If it's a year-to-date range, compare with previous year
                        previous_start_date = timezone.make_aware(datetime.combine(
                            datetime(today.year - 1, start_date_parsed.month, start_date_parsed.day).date(),
                            datetime.min.time()
                        ))
                        previous_end_date = timezone.make_aware(datetime.combine(
                            datetime(today.year - 1, end_date_parsed.month, min(end_date_parsed.day, 28 if end_date_parsed.month == 2 else 30)).date(),
                            datetime.max.time()
                        ))
                    elif is_month_to_date:
                        # If it's a month-to-date range, compare with previous month
                        if start_date_parsed.month == 1:  # January
                            prev_month_year = today.year - 1
                            prev_month = 12
                        else:
                            prev_month_year = today.year
                            prev_month = start_date_parsed.month - 1
                            
                        previous_start_date = timezone.make_aware(datetime.combine(
                            datetime(prev_month_year, prev_month, 1).date(),
                            datetime.min.time()
                        ))
                        
                        # Handle varying month lengths properly
                        last_day_of_prev_month = min(end_date_parsed.day, 28 if prev_month == 2 else 30 if prev_month in [4, 6, 9, 11] else 31)
                        previous_end_date = timezone.make_aware(datetime.combine(
                            datetime(prev_month_year, prev_month, last_day_of_prev_month).date(),
                            datetime.max.time()
                        ))
                    elif is_quarter_to_date:
                        # If it's a quarter-to-date range, compare with previous quarter
                        if quarter_start_month == 1:  # Q1
                            prev_quarter_year = today.year - 1
                            prev_quarter_month = 10  # October of previous year (Q4)
                        else:
                            prev_quarter_year = today.year
                            prev_quarter_month = quarter_start_month - 3
                            
                        previous_start_date = timezone.make_aware(datetime.combine(
                            datetime(prev_quarter_year, prev_quarter_month, 1).date(),
                            datetime.min.time()
                        ))
                        
                        # For the end date, calculate days in quarter
                        days_in_range = (end_date_parsed - start_date_parsed).days
                        previous_end_date = previous_start_date + timedelta(days=days_in_range, seconds=86399)
                    else:
                        # For other custom ranges, use same length previous period
                        period_length = (end_date_parsed - start_date_parsed).days + 1
                        previous_end_date = start_date - timedelta(seconds=1)
                        previous_start_date = previous_end_date - timedelta(days=period_length) + timedelta(seconds=1)
                    
                    print(f"Financial Analytics - Using custom date range: {start_date} to {end_date}")
                    print(f"Financial Analytics - Previous period: {previous_start_date} to {previous_end_date}")
                except ValueError as e:
                    # Fallback to default if date parsing fails
                    print(f"Financial Analytics - Error parsing custom dates: {e}")
                    today = end_date.date()
                    first_day_of_month = today.replace(day=1)
                    start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
            else:
                # Fallback to default if dates not provided
                today = end_date.date()
                first_day_of_month = today.replace(day=1)
                start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
        elif time_range == 'day':
            # Set start_date to the beginning of today (midnight)
            today = end_date.date()
            start_date = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        elif time_range == 'week':
            # Get current weekday (0 = Monday in Python's datetime)
            today = end_date.date()
            # Find the first day of the current week (Monday)
            current_weekday = today.weekday()
            days_to_subtract = current_weekday  # 0 for Monday, 1 for Tuesday, etc.
            start_of_week = today - timedelta(days=days_to_subtract)
            start_date = timezone.make_aware(datetime.combine(start_of_week, datetime.min.time()))
        elif time_range == 'month':
            # Set to first day of current month
            today = end_date.date()
            first_day_of_month = today.replace(day=1)
            start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))
        elif time_range == 'quarter':
            # Determine current quarter
            today = end_date.date()
            current_month = today.month
            current_quarter = (current_month - 1) // 3 + 1
            quarter_start_month = (current_quarter - 1) * 3 + 1
            # First day of the current quarter
            first_day_of_quarter = datetime(today.year, quarter_start_month, 1).date()
            start_date = timezone.make_aware(datetime.combine(first_day_of_quarter, datetime.min.time()))
        elif time_range == 'year':
            # Set to first day of current year
            today = end_date.date()
            first_day_of_year = datetime(today.year, 1, 1).date()
            start_date = timezone.make_aware(datetime.combine(first_day_of_year, datetime.min.time()))
        else:
            # Default to current month if time_range not recognized
            today = end_date.date()
            first_day_of_month = today.replace(day=1)
            start_date = timezone.make_aware(datetime.combine(first_day_of_month, datetime.min.time()))        # Filter queries by date range
        sales_query = Sales.objects.filter(sold_at__gte=start_date, sold_at__lte=end_date)
        refills_query = Refills.objects.filter(created_at__gte=start_date, created_at__lte=end_date)
        expenses_query = Expenses.objects.filter(created_at__gte=start_date, created_at__lte=end_date)
        credits_query = Credits.objects.filter(payment_date__gte=start_date, payment_date__lte=end_date)
        
        # For comparison, also filter previous period data
        # Define previous_start_date and previous_end_date if not already defined
        if 'previous_start_date' not in locals() or 'previous_end_date' not in locals():
            if time_range == 'day':
                # Previous day
                previous_day = end_date.date() - timedelta(days=1)
                previous_start_date = timezone.make_aware(datetime.combine(previous_day, datetime.min.time()))
                previous_end_date = timezone.make_aware(datetime.combine(previous_day, datetime.max.time()))
            elif time_range == 'week':
                # Previous week
                previous_week_end = start_date - timedelta(seconds=1)
                previous_week_start = previous_week_end - timedelta(days=6)
                previous_start_date = previous_week_start
                previous_end_date = previous_week_end
            elif time_range == 'month':
                # Previous month
                today = end_date.date()
                first_day_of_month = today.replace(day=1)
                if first_day_of_month.month == 1:  # January
                    prev_month_year = first_day_of_month.year - 1
                    prev_month = 12
                else:
                    prev_month_year = first_day_of_month.year
                    prev_month = first_day_of_month.month - 1
                previous_start_date = timezone.make_aware(datetime.combine(
                    datetime(prev_month_year, prev_month, 1).date(),
                    datetime.min.time()
                ))
                # Get last day of previous month
                if prev_month == 12:  # December
                    last_day = datetime(prev_month_year + 1, 1, 1) - timedelta(days=1)
                else:
                    last_day = datetime(prev_month_year, prev_month + 1, 1) - timedelta(days=1)
                previous_end_date = timezone.make_aware(datetime.combine(
                    last_day.date(),
                    datetime.max.time()
                ))
            elif time_range == 'quarter':
                # Previous quarter
                today = end_date.date()
                current_month = today.month
                current_quarter = (current_month - 1) // 3 + 1
                quarter_start_month = (current_quarter - 1) * 3 + 1
                if quarter_start_month == 1:  # Q1
                    prev_quarter_year = today.year - 1
                    prev_quarter_month = 10  # October of previous year (Q4)
                else:
                    prev_quarter_year = today.year
                    prev_quarter_month = quarter_start_month - 3
                previous_start_date = timezone.make_aware(datetime.combine(
                    datetime(prev_quarter_year, prev_quarter_month, 1).date(),
                    datetime.min.time()
                ))
                # End date is one day before the start of current quarter
                first_day_of_current_quarter = datetime(today.year, quarter_start_month, 1).date()
                previous_end_date = timezone.make_aware(datetime.combine(
                    first_day_of_current_quarter - timedelta(days=1),
                    datetime.max.time()
                ))
            elif time_range == 'year':
                # Previous year
                today = end_date.date()
                previous_start_date = timezone.make_aware(datetime.combine(
                    datetime(today.year - 1, 1, 1).date(),
                    datetime.min.time()
                ))
                previous_end_date = timezone.make_aware(datetime.combine(
                    datetime(today.year - 1, 12, 31).date(),
                    datetime.max.time()
                ))
            else:
                # Default to previous month
                today = end_date.date()
                first_day_of_month = today.replace(day=1)
                previous_end_date = timezone.make_aware(datetime.combine(
                    first_day_of_month - timedelta(days=1),
                    datetime.max.time()
                ))
                previous_start_date = timezone.make_aware(datetime.combine(
                    previous_end_date.replace(day=1),
                    datetime.min.time()
                ))
        
        # Get previous period queries
        previous_sales_query = Sales.objects.filter(sold_at__gte=previous_start_date, sold_at__lte=previous_end_date)
        previous_refills_query = Refills.objects.filter(created_at__gte=previous_start_date, created_at__lte=previous_end_date)
        previous_expenses_query = Expenses.objects.filter(created_at__gte=previous_start_date, created_at__lte=previous_end_date)
        previous_credits_query = Credits.objects.filter(payment_date__gte=previous_start_date, payment_date__lte=previous_end_date)

        # Filter by shop if specified
        if shop_id and shop_id != 'all':
            sales_query = sales_query.filter(shop_id=shop_id)
            refills_query = refills_query.filter(shop_id=shop_id)
            expenses_query = expenses_query.filter(shop_id=shop_id)
            credits_query = credits_query.filter(shop_id=shop_id)

        # Calculate total revenue
        sales_revenue = sales_query.aggregate(total=Sum('cost'))['total'] or 0
        refill_revenue = refills_query.aggregate(total=Sum('cost'))['total'] or 0
        total_revenue = sales_revenue + refill_revenue

        # Calculate total expenses
        total_expenses = expenses_query.aggregate(total=Sum('cost'))['total'] or 0

        # Calculate gross profit (revenue - direct expenses)
        # For simplicity, we'll assume 30% of expenses are direct costs
        direct_expenses = total_expenses * Decimal('0.3')  # Simplified
        gross_profit = total_revenue - direct_expenses

        # Calculate net profit (gross profit - indirect expenses)
        indirect_expenses = total_expenses * Decimal('0.7')  # Simplified
        net_profit = gross_profit - indirect_expenses

        # Calculate profit margin
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        profit_margin = round(profit_margin, 1)

        # Group expenses by category
        expense_categories = {}
        for expense in expenses_query:
            category = expense.description.split(' - ')[0] if ' - ' in expense.description else 'Other'
            # Simplify categories
            if 'Electricity' in category or 'Water' in category or 'Utility' in category:
                category = 'Utilities'
            elif 'Rent' in category:
                category = 'Rent'
            elif 'Salary' in category or 'Wage' in category or 'Staff' in category:
                category = 'Salaries'
            elif 'Maintenance' in category or 'Repair' in category:
                category = 'Maintenance'
                
            if category not in expense_categories:
                expense_categories[category] = 0
            expense_categories[category] += expense.cost

        # Calculate revenue by shop
        revenue_by_shop = {}
        shops = Shops.objects.all()
        for shop in shops:
            shop_sales = sales_query.filter(shop=shop).aggregate(total=Sum('cost'))['total'] or 0
            shop_refills = refills_query.filter(shop=shop).aggregate(total=Sum('cost'))['total'] or 0
            revenue_by_shop[shop.shopName] = shop_sales + shop_refills

        # Calculate monthly financial trends
        monthly_financials = []
        
        if time_range == 'month':
            # For month, get weekly breakdown
            for i in range(4):  # 4 weeks
                week_end = end_date - timedelta(days=7*i)
                week_start = week_end - timedelta(days=6)
                
                week_sales = sales_query.filter(sold_at__gte=week_start, sold_at__lte=week_end)
                week_refills = refills_query.filter(created_at__gte=week_start, created_at__lte=week_end)
                week_expenses = expenses_query.filter(created_at__gte=week_start, created_at__lte=week_end)
                
                week_revenue = (week_sales.aggregate(total=Sum('cost'))['total'] or 0) + \
                              (week_refills.aggregate(total=Sum('cost'))['total'] or 0)
                              
                week_expense = week_expenses.aggregate(total=Sum('cost'))['total'] or 0
                week_profit = week_revenue - week_expense
                
                monthly_financials.append({
                    'month': f"Week {4-i}",  # Label as Week 1, Week 2, etc.
                    'revenue': week_revenue,
                    'expenses': week_expense,
                    'profit': week_profit
                })
        else:
            # For quarter/year, get monthly breakdown
            num_months = 3  # For quarter
            if time_range == 'year':
                num_months = 12
                
            for i in range(num_months):
                month_end = end_date.replace(day=1) - timedelta(days=1)  # Last day of previous month
                month_end = month_end - timedelta(days=30*i)  # Go back i months
                month_start = month_end.replace(day=1)  # First day of that month
                
                month_sales = sales_query.filter(sold_at__gte=month_start, sold_at__lte=month_end)
                month_refills = refills_query.filter(created_at__gte=month_start, created_at__lte=month_end)
                month_expenses = expenses_query.filter(created_at__gte=month_start, created_at__lte=month_end)
                
                month_revenue = (month_sales.aggregate(total=Sum('cost'))['total'] or 0) + \
                               (month_refills.aggregate(total=Sum('cost'))['total'] or 0)
                               
                month_expense = month_expenses.aggregate(total=Sum('cost'))['total'] or 0
                month_profit = month_revenue - month_expense
                
                monthly_financials.append({
                    'month': month_start.strftime('%b'),  # Month abbreviation
                    'revenue': month_revenue,
                    'expenses': month_expense,
                    'profit': month_profit
                })
                
        # Reverse to get chronological order
        monthly_financials.reverse()        # Calculate cash flow
        # Cash inflow: sales + refills + credit payments
        cash_inflow = total_revenue + (credits_query.aggregate(total=Sum('money_paid'))['total'] or 0)
        
        # Cash outflow: expenses
        cash_outflow = total_expenses
        
        # Net cash flow
        net_cash_flow = cash_inflow - cash_outflow
        
        cash_flow = {
            'inflow': cash_inflow,
            'outflow': cash_outflow,
            'net': net_cash_flow
        }
        
        # Calculate previous period metrics for comparison
        # Previous period revenue
        previous_sales_revenue = previous_sales_query.aggregate(total=Sum('cost'))['total'] or 0
        previous_refill_revenue = previous_refills_query.aggregate(total=Sum('cost'))['total'] or 0
        previous_total_revenue = previous_sales_revenue + previous_refill_revenue
        
        # Previous period expenses
        previous_total_expenses = previous_expenses_query.aggregate(total=Sum('cost'))['total'] or 0
        
        # Previous period profit
        previous_direct_expenses = previous_total_expenses * Decimal('0.3')  # Simplified
        previous_gross_profit = previous_total_revenue - previous_direct_expenses
        previous_indirect_expenses = previous_total_expenses * Decimal('0.7')  # Simplified
        previous_net_profit = previous_gross_profit - previous_indirect_expenses
        
        # Calculate percentage changes
        revenue_change_percentage = 0
        expense_change_percentage = 0
        profit_change_percentage = 0
        
        if previous_total_revenue > 0:
            revenue_change_percentage = round(((total_revenue - previous_total_revenue) / previous_total_revenue) * 100, 1)
            
        if previous_total_expenses > 0:
            expense_change_percentage = round(((total_expenses - previous_total_expenses) / previous_total_expenses) * 100, 1)
            
        if previous_net_profit > 0:
            profit_change_percentage = round(((net_profit - previous_net_profit) / previous_net_profit) * 100, 1)
        
        # Get recent expenses
        recent_expenses = []
        for expense in expenses_query.order_by('-created_at')[:5]:
            category = expense.description.split(' - ')[0] if ' - ' in expense.description else 'Other'
            # Simplify categories as before
            if 'Electricity' in category or 'Water' in category or 'Utility' in category:
                category = 'Utilities'
            elif 'Rent' in category:
                category = 'Rent'
            elif 'Salary' in category or 'Wage' in category or 'Staff' in category:
                category = 'Salaries'
            elif 'Maintenance' in category or 'Repair' in category:
                category = 'Maintenance'
                
            recent_expenses.append({
                'id': expense.id,
                'date': expense.created_at.strftime('%Y-%m-%d'),
                'description': expense.description,                'amount': expense.cost,
                'category': category
            })
            
        response_data = {
            'total_revenue': total_revenue,
            'gross_profit': gross_profit,
            'net_profit': net_profit,
            'total_expenses': total_expenses,
            'profit_margin': profit_margin,
            'expense_categories': expense_categories,
            'revenue_by_shop': revenue_by_shop,
            'monthly_financials': monthly_financials,
            'cash_flow': cash_flow,
            'recent_expenses': recent_expenses,
            'revenue_change_percentage': revenue_change_percentage,
            'expense_change_percentage': expense_change_percentage,
            'profit_change_percentage': profit_change_percentage
        }
        
        return Response(response_data)


# Keep the existing individual APIView classes for backward compatibility
class SalesAnalyticsView(APIView):
    """
    API endpoint for sales analytics data.
    """
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsShopAgentOrDirector]

    def get(self, request):
        # Create a ViewSet instance and delegate to it
        viewset = AnalyticsViewSet()
        viewset.request = request
        return viewset.sales(request)


class CustomerAnalyticsView(APIView):
    """
    API endpoint for customer analytics data.
    """
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsShopAgentOrDirector]

    def get(self, request):
        # Create a ViewSet instance and delegate to it
        viewset = AnalyticsViewSet()
        viewset.request = request
        return viewset.customers(request)


class InventoryAnalyticsView(APIView):
    """
    API endpoint for inventory analytics data.
    """
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsShopAgentOrDirector]

    def get(self, request):
        # Create a ViewSet instance and delegate to it
        viewset = AnalyticsViewSet()
        viewset.request = request
        return viewset.inventory(request)


# The inventory adjustment and history views are defined in inventory_views.py


class FinancialAnalyticsView(APIView):
    """
    API endpoint for financial analytics data.
    """
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication, BasicAuthentication]
    permission_classes = [IsShopAgentOrDirector]

    def get(self, request):
        # Create a ViewSet instance and delegate to it
        viewset = AnalyticsViewSet()
        viewset.request = request
        return viewset.financial(request)
