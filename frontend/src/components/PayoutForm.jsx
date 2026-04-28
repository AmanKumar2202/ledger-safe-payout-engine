import React, { useState } from 'react';
import { createPayout } from '../api/payouts';

const PayoutForm = ({ merchantId, onPayoutSuccess }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const idempotencyKey = crypto.randomUUID();
    const amountInPaise = parseInt(amount) * 100;

    try {
      await createPayout(merchantId, amountInPaise, idempotencyKey);
      setAmount('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onPayoutSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Payout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Request Payout</h3>
          <p className="text-xs text-slate-500 mt-0.5">Funds will be transferred instantly</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount (INR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            'Confirm Payout'
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
              <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.3"/>
              <path d="M7 4v3M7 9.5v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <circle cx="7" cy="7" r="6" stroke="#34d399" strokeWidth="1.3"/>
              <path d="M4.5 7l2 2 3-3" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-xs text-emerald-400">Payout request submitted successfully</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default PayoutForm;
