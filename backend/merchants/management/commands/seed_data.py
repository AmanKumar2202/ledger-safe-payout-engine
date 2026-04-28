from django.core.management.base import BaseCommand
from merchants.models import Merchant, LedgerEntry

class Command(BaseCommand):
    help = 'Seeds the database with test merchants and history'

    def handle(self, *args, **kwargs):
        # Create Merchants
        m1 = Merchant.objects.create(name="Alpha Freelance Agency")
        m2 = Merchant.objects.create(name="Beta Design Studio")

        # Seed Credits 
        LedgerEntry.objects.create(merchant=m1, amount_paise=500000, entry_type='CREDIT') # 5000 INR
        LedgerEntry.objects.create(merchant=m2, amount_paise=1000000, entry_type='CREDIT')
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded 2 merchants with initial credit.'))