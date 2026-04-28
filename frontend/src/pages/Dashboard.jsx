import React, { useState, useEffect } from 'react';
import { getBalance, getPayoutHistory } from '../api/payouts';
import BalanceCard from '../components/BalanceCard';
import PayoutForm from '../components/PayoutForm';
import PayoutTable from '../components/PayoutTable';

const Dashboard = () => {
  const [balance, setBalance] = useState(0);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const merchantId = 1;
      const [balRes, histRes] = await Promise.all([
        getBalance(merchantId),
        getPayoutHistory(merchantId)
      ]);
      setBalance(balRes.data.balance);
      setPayouts(histRes.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-8">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-1">Merchant ID #1</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <BalanceCard balance={balance} />
        <PayoutForm merchantId={1} onPayoutSuccess={fetchData} />
      </div>

      <PayoutTable payouts={payouts} />
    </div>
  );
};

export default Dashboard;
