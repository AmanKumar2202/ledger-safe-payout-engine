from django.db.models import Sum, Q
from .models import LedgerEntry

def get_merchant_balance(merchant):
    credits = LedgerEntry.objects.filter(merchant=merchant, entry_type='CREDIT').aggregate(total=Sum('amount_paise'))['total'] or 0
    debits = LedgerEntry.objects.filter(merchant=merchant, entry_type='DEBIT').aggregate(total=Sum('amount_paise'))['total'] or 0
    
    return int(credits) - int(debits)