from django.db import models
from django.conf import settings

class Merchant(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class LedgerEntry(models.Model):
    ENTRY_TYPES = (
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
    )

    merchant = models.ForeignKey(
        Merchant, 
        on_delete=models.PROTECT, 
        related_name='ledger_entries'
    )
    amount_paise = models.BigIntegerField()  # Integer only, no floats!
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPES)
    
    # reference_id links this to a specific Payout or Payment object
    # Null=True because a manual credit might not have a payout reference
    reference_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Indexing for fast balance calculation queries
        indexes = [
            models.Index(fields=['merchant', 'created_at']),
        ]

    def __str__(self):
        return f"{self.merchant.name} - {self.entry_type} - {self.amount_paise}"