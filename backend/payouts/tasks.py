import random
from celery import shared_task
# from .models import Payout
from django.db import transaction
from merchants.models import LedgerEntry
from payouts.models import Payout

@shared_task(bind=True, max_retries=3)
def process_payout(self, payout_id):
    payout = Payout.objects.get(id=payout_id)
    
    # Check if it was already processed (Idempotency check)
    if payout.status != 'PENDING':
        return # Already handled
        
    try:
        # Move to processing
        payout.transition_to('PROCESSING')
        
        outcome = random.random()
        
        # Simulate Hang (10%)
        if outcome < 0.10:
            raise Exception("Bank gateway hung")
            
        # Simulate Failure (20%)
        elif outcome < 0.30:
            with transaction.atomic():
                payout.transition_to('FAILED')
                LedgerEntry.objects.create(
                    merchant=payout.merchant,
                    amount_paise=payout.amount_paise,
                    entry_type='CREDIT',
                    reference_id=payout.id
                )
        
        # Success (70%)
        else:
            payout.transition_to('COMPLETED')

    except Exception as exc:
        # Retry logic for hangs
        raise self.retry(exc=exc, countdown=60)