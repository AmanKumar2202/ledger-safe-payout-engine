import React from 'react';

const statusConfig = {
  PENDING:    { dot: 'bg-amber-400',  text: 'text-amber-400',  badge: 'bg-amber-400/10 border-amber-400/20' },
  PROCESSING: { dot: 'bg-blue-400',   text: 'text-blue-400',   badge: 'bg-blue-400/10 border-blue-400/20' },
  COMPLETED:  { dot: 'bg-emerald-400',text: 'text-emerald-400',badge: 'bg-emerald-400/10 border-emerald-400/20' },
  FAILED:     { dot: 'bg-red-400',    text: 'text-red-400',    badge: 'bg-red-400/10 border-red-400/20' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { dot: 'bg-slate-400', text: 'text-slate-400', badge: 'bg-slate-400/10 border-slate-400/20' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.badge} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const PayoutTable = ({ payouts }) => {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white">Payout History</h3>
          <p className="text-xs text-slate-500 mt-0.5">{payouts.length} transaction{payouts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {payouts.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="11" rx="2" stroke="#475569" strokeWidth="1.4"/>
              <path d="M5 8h8M5 11h5" stroke="#475569" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm text-slate-500">No payout records yet</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transaction ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {payouts.map((payout) => (
              <tr key={payout.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={payout.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-white">
                    ₹{(payout.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {new Date(payout.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs text-slate-600 font-mono bg-slate-800 px-2 py-1 rounded">
                    #{String(payout.id).padStart(6, '0')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PayoutTable;
