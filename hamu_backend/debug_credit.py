# Run this with: python manage.py shell < debug_credit.py
# Or paste into: python manage.py shell

from customers.models import Customers
from refills.models import Refills
from credits.models import Credits
from sales.models import Sales

# Find Allan Thome
customer = Customers.objects.filter(names__icontains='Allan Thome').first()

if not customer:
    print("ERROR: Customer 'Allan Thome' not found!")
    print("Available customers with 'Allan':")
    for c in Customers.objects.filter(names__icontains='Allan')[:5]:
        print(f"  - {c.id}: {c.names}")
else:
    print("="*60)
    print(f"CUSTOMER: {customer.names} (ID: {customer.id})")
    print(f"Phone: {customer.phone_number}")
    print("="*60)
    
    # Get all CREDIT refills
    credit_refills = Refills.objects.filter(customer=customer, payment_mode='CREDIT')
    print(f"\n📦 CREDIT REFILLS ({credit_refills.count()}):")
    total_credit_refills = 0
    for r in credit_refills:
        total_credit_refills += float(r.cost or 0)
        print(f"  - {r.created_at.date()} | Cost: KES {r.cost} | Package: {r.package}")
    print(f"  TOTAL REFILLS ON CREDIT: KES {total_credit_refills}")
    
    # Get all CREDIT sales
    credit_sales = Sales.objects.filter(customer=customer, payment_mode='CREDIT')
    print(f"\n🛒 CREDIT SALES ({credit_sales.count()}):")
    total_credit_sales = 0
    for s in credit_sales:
        total_credit_sales += float(s.cost or 0)
        print(f"  - {s.created_at.date()} | Cost: KES {s.cost} | Package: {s.package}")
    print(f"  TOTAL SALES ON CREDIT: KES {total_credit_sales}")
    
    # Get all credit payments
    credit_payments = Credits.objects.filter(customer=customer)
    print(f"\n💰 CREDIT PAYMENTS ({credit_payments.count()}):")
    total_repaid = 0
    for p in credit_payments:
        total_repaid += float(p.money_paid or 0)
        print(f"  - {p.payment_date} | Paid: KES {p.money_paid} | Mode: {p.payment_mode}")
    print(f"  TOTAL REPAID: KES {total_repaid}")
    
    # Calculate balances
    print("\n" + "="*60)
    print("📊 CALCULATIONS:")
    print("="*60)
    
    total_owed = total_credit_refills + total_credit_sales
    print(f"Total Owed (Refills + Sales on CREDIT): KES {total_owed}")
    print(f"Total Repaid (Credit Payments):         KES {total_repaid}")
    
    # export_for_offline style (repaid - owed)
    balance_export = total_repaid - total_owed
    print(f"\n[export_for_offline] credit_balance = repaid - owed")
    print(f"  = {total_repaid} - {total_owed} = {balance_export}")
    if balance_export < 0:
        print(f"  → Customer OWES KES {abs(balance_export)}")
    elif balance_export > 0:
        print(f"  → Customer has CREDIT of KES {balance_export}")
    else:
        print(f"  → Balance is ZERO")
    
    # customer-insights style (outstanding)
    outstanding = max(0, total_owed - total_repaid)
    print(f"\n[customer-insights] credit.outstanding = max(0, owed - repaid)")
    print(f"  = max(0, {total_owed} - {total_repaid}) = {outstanding}")
    
    print("\n" + "="*60)
    print("EXPECTED VALUES:")
    print("="*60)
    print(f"Customer List (credit_balance):  {balance_export}")
    print(f"Customer Detail (outstanding negated): {-outstanding}")
    print(f"Should show 'OWES' badge: {balance_export < 0}")
