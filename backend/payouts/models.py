from django.db import models
from merchants.models import Merchant
from django.core.exceptions import ValidationError

class Payout(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )

    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT)
    amount_paise = models.BigIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Idempotency
    idempotency_key = models.CharField(max_length=255, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # A merchant cannot use the same key twice
        unique_together = ('merchant', 'idempotency_key')

    def __str__(self):
        return f"Payout {self.id} - {self.status}"
    
    def transition_to(self, new_status):
        """
        State Machine Guard: 
        Ensures we never go backwards or re-process finished payouts.
        """
        allowed_transitions = {
            'PENDING': ['PROCESSING', 'FAILED'],
            'PROCESSING': ['COMPLETED', 'FAILED'],
            'COMPLETED': [],  # End state, no exit
            'FAILED': [],     
        }

        if new_status not in allowed_transitions.get(self.status, []):
            raise ValidationError(f"Illegal transition: {self.status} -> {new_status}")
        
        self.status = new_status
        self.save()