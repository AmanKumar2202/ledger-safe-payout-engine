from django.urls import path
from .views import MerchantBalanceView, MerchantPayoutHistoryView 

urlpatterns = [
    path('<int:merchant_id>/balance/', MerchantBalanceView.as_view(), name='merchant-balance'),
    path('<int:merchant_id>/payouts/', MerchantPayoutHistoryView.as_view(), name='merchant-payouts'),
]