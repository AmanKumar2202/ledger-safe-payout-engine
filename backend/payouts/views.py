from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import IntegrityError
from merchants.models import Merchant
from .models import Payout
from .services import create_payout_request
from payouts.tasks import process_payout

class PayoutRequestView(APIView):
    def post(self, request):
        idempotency_key = request.headers.get('Idempotency-Key')
        if not idempotency_key:
            return Response({"error": "Idempotency-Key header is required"}, status=400)

        merchant_id = request.data.get('merchant_id')
        amount_paise = request.data.get('amount_paise')

        try:
            merchant = Merchant.objects.get(pk=merchant_id)
            
            existing_payout = Payout.objects.filter(
                merchant=merchant, 
                idempotency_key=idempotency_key
            ).first()

            if existing_payout:
                return Response({
                    "id": existing_payout.id, 
                    "status": existing_payout.status,
                    "message": "Duplicate request"
                }, status=200)

            # Create record
            payout = create_payout_request(merchant, amount_paise, idempotency_key)
            
            # Trigger the task
            process_payout.delay(payout.id)
            
            return Response({"id": payout.id, "status": payout.status}, status=201)

        except Merchant.DoesNotExist:
            return Response({"error": "Merchant not found"}, status=404)
        except Exception as e:
            # Print the full error
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)