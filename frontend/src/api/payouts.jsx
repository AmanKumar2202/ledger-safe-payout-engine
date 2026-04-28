import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

export const getBalance = (merchantId) => api.get(`/merchants/${merchantId}/balance/`);
export const getPayoutHistory = (merchantId) => api.get(`/merchants/${merchantId}/payouts/`);
export const createPayout = (merchantId, amount, idempotencyKey) => {
  return api.post('/payouts/', 
    { merchant_id: merchantId, amount_paise: amount },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  );
};