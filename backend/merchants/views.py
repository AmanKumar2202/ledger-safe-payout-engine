from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Merchant
from .selectors import get_merchant_balance
from payouts.models import Payout

class MerchantBalanceView(APIView):
    def get(self, request, merchant_id):
        merchant = Merchant.objects.get(pk=merchant_id)
        return Response({"balance": get_merchant_balance(merchant)})

class MerchantPayoutHistoryView(APIView):
    def get(self, request, merchant_id):
        payouts = Payout.objects.filter(merchant_id=merchant_id).order_by('-created_at')
        return Response([
            {"id": p.id, "status": p.status, "amount_paise": p.amount_paise, "created_at": p.created_at} 
            for p in payouts
        ])