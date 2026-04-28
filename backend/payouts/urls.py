from django.urls import path
from .views import PayoutRequestView

urlpatterns = [
    path('', PayoutRequestView.as_view(), name='payout-create'),
]