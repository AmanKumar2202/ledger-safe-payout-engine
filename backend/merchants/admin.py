from django.contrib import admin
from .models import Merchant, LedgerEntry

admin.site.register(Merchant)
admin.site.register(LedgerEntry)