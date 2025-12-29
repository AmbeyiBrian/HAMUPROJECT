"""
Script to check credit balance for a customer.
Run with: python manage.py shell < check_credit.py
Or: python manage.py runscript check_credit (if django-extensions installed)
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hamu_backend.settings')
django.setup()

from customers.models import Customers

# Find customer DevOps
customer = Customers.objects.filter(names__icontains='DevOps').first()
if not customer:
    print('Customer DevOps not found')
else:
    print(f'Customer: {customer.names} (ID: {customer.id})')
    print(f'Shop: {customer.shop.shopName if customer.shop else "None"}')
    print()
    
    # Calculate credit owed (CREDIT payment mode refills + sales)
    credit_refills = customer.refills.filter(payment_mode='CREDIT')
    credit_sales = customer.sales.filter(payment_mode='CREDIT') if hasattr(customer, 'sales') else []
    
    total_credit_owed = sum(float(r.cost or 0) for r in credit_refills)
    total_credit_owed += sum(float(s.cost or 0) for s in credit_sales)
    
    # Calculate total repaid (credit_payments)
    total_repaid = sum(float(p.money_paid or 0) for p in customer.credit_payments.all())
    
    # Credit balance (positive = customer has credit to use)
    credit_balance = total_repaid - total_credit_owed
    
    print('=== CREDIT CALCULATION ===')
    print(f'Total Credit Owed (CREDIT refills+sales): KES {total_credit_owed:.2f}')
    print(f'Total Repaid (credit_payments): KES {total_repaid:.2f}')
    print(f'Credit Balance: KES {credit_balance:.2f}')
    print()
    
    if credit_balance > 0:
        print(f'✅ Customer has KES {credit_balance:.2f} CREDIT BALANCE to use')
    elif credit_balance < 0:
        print(f'⚠️ Customer OWES KES {abs(credit_balance):.2f}')
    else:
        print('Credit balance is zero')
    
    print()
    print('=== CREDIT PAYMENTS HISTORY ===')
    for p in customer.credit_payments.all().order_by('-payment_date')[:10]:
        print(f'  {p.payment_date.strftime("%Y-%m-%d")} | {p.agent_name:15} | KES {float(p.money_paid):>10.2f}')
