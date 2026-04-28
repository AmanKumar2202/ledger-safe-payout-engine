from django.contrib import admin
from .models import Merchant, LedgerEntry

@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = ['name', 'balance_paise']

@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ['merchant', 'amount_paise', 'entry_type', 'reference_id']