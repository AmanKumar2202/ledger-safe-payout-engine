import React from 'react';

const BalanceCard = ({ balance }) => {
  const balanceInr = (balance / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-6 shadow-lg shadow-violet-900/30">
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5"></div>
      <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5"></div>

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-semibold text-violet-200 uppercase tracking-widest">Available Balance</p>
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="white" strokeWidth="1.3"/>
              <path d="M1 6h12" stroke="white" strokeWidth="1.3"/>
              <circle cx="4" cy="9" r="0.8" fill="white"/>
            </svg>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-white tracking-tight">{balanceInr}</span>
        </div>

        <p className="mt-4 text-xs text-violet-300">
          Calculated in real-time from ledger records
        </p>
      </div>
    </div>
  );
};

export default BalanceCard;
