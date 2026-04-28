import threading
from django.test import TransactionTestCase
from rest_framework.test import APIClient
from merchants.models import Merchant, LedgerEntry
from payouts.models import Payout
from django.core.exceptions import ValidationError

class PayoutSystemTest(TransactionTestCase):
    def setUp(self):
        self.merchant = Merchant.objects.create(name="Test Merchant")
        LedgerEntry.objects.create(merchant=self.merchant, amount_paise=10000, entry_type='CREDIT')
        self.client = APIClient()

    def test_concurrent_payouts(self):
        """
        Verifies that concurrent requests with the SAME idempotency key
        result in exactly one payout (atomicity and idempotency).
        """
        def make_payout():
            payload = {'merchant_id': self.merchant.id, 'amount_paise': 7000}
            return self.client.post(
                '/api/v1/payouts/', 
                payload, 
                content_type='application/json', 
                HTTP_IDEMPOTENCY_KEY='same-key-123'
            )

        t1 = threading.Thread(target=make_payout)
        t2 = threading.Thread(target=make_payout)

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Assertions
        payout_count = Payout.objects.filter(merchant=self.merchant).count()
        debit_count = LedgerEntry.objects.filter(merchant=self.merchant, entry_type='DEBIT').count()
        
        # Concurrency check: Exactly one payout and one debit should exist
        self.assertEqual(payout_count, 1, "Concurrency error: Multiple payouts created.")
        self.assertEqual(debit_count, 1, "Concurrency error: Multiple debits recorded.")

    def test_state_machine_guard(self):
        """
        Verifies that illegal state transitions are blocked.
        """
        payout = Payout.objects.create(
            merchant=self.merchant, 
            amount_paise=1000, 
            status='PENDING',
            idempotency_key='key-2'
        )
        
        # Simulate moving to COMPLETED
        payout.status = 'COMPLETED'
        payout.save()
        
        # Assert that we cannot move from COMPLETED back to PENDING
        with self.assertRaises(ValidationError):
            payout.transition_to('PENDING')