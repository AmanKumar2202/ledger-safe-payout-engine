# business logic
from django.db import transaction
from django.core.exceptions import ValidationError
from merchants.selectors import get_merchant_balance
from merchants.models import LedgerEntry,Merchant
from .models import Payout

def create_payout_request(merchant, amount_paise, idempotency_key):
    # Atomic transaction ensures all operations succeed or none do
    with transaction.atomic():
        # 1. LOCK the merchant row to prevent concurrent modifications
        # select_for_update() prevents other requests from reading this merchant 
        # until this transaction commits.
        merchant_locked = Merchant.objects.select_for_update().get(pk=merchant.pk)
        
        # 2. Check balance
        balance = get_merchant_balance(merchant_locked)
        amount_paise = int(amount_paise)
        
        if balance < amount_paise:
            raise ValidationError("Insufficient funds.")
        
        # 3. Create the Payout record
        payout = Payout.objects.create(
            merchant=merchant_locked,
            amount_paise=amount_paise,
            status='PENDING',
            idempotency_key=idempotency_key
        )
        
        # 4. Immediately record the DEBIT to hold the funds
        LedgerEntry.objects.create(
            merchant=merchant_locked,
            amount_paise=amount_paise,
            entry_type='DEBIT',
            reference_id=payout.id
        )
        
        return payout
    
