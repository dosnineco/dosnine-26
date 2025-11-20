
// /pages/tools/debt-snowball-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface DebtItem {
  id: number;
  name: string;
  balance: number;
  interestRate: number;
  minPayment: number;
}

const defaultDebts: DebtItem[] = [
  { id: 1, name: 'Credit Card', balance: 5000, interestRate: 18.99, minPayment: 200 },
  { id: 2, name: 'Car Loan', balance: 15000, interestRate: 4.5, minPayment: 300 },
];

const DebtSnowballTracker: React.FC = () => {
  const [debts, setDebts] = useState<DebtItem[]>(defaultDebts);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleAddDebt = () => {
    const newDebt: DebtItem = {
      id: debts.length + 1,
      name: `Debt ${debts.length + 1}`,
      balance: 0,
      interestRate: 0,
      minPayment: 0,
    };
    setDebts([...debts, newDebt]);
  };

  const handleDebtChange = (id: number, field: keyof DebtItem, value: string) => {
    const updatedDebts = debts.map(debt =>
      debt.id === id ? { ...debt, [field]: parseFloat(value) || 0 } : debt
    );
    setDebts(updatedDebts);
  };

  const calculateSnowball = () => {
    // Simplified calculation logic for demonstration
    const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
    const results = sortedDebts.map(debt => ({
      name: debt.name,
      balance: debt.balance,
      monthsToPayOff: Math.ceil(debt.balance / debt.minPayment),
    }));
    setChartData(results);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + debts.map(d => `${d.name},${d.balance},${d.interestRate},${d.minPayment}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'debt_snowball.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Debt Snowball Tracker</title>
        <meta name="description" content="Track and manage your debts using the Debt Snowball method." />
        <meta name="keywords" content="debt, snowball, finance, tracker" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/debt-snowball-tracker" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Debt Snowball Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Debt Snowball Tracker! This tool helps you manage and pay off your debts using the snowball method. Enter your debts below to get started.
      </p>
      <div className="mb-4">
        {debts.map(debt => (
          <div key={debt.id} className="mb-4">
            <input
              type="text"
              value={debt.name}
              onChange={(e) => handleDebtChange(debt.id, 'name', e.target.value)}
              className="border p-2 mb-2 w-full"
              placeholder="Debt Name"
            />
            <input
              type="number"
              value={debt.balance}
              onChange={(e) => handleDebtChange(debt.id, 'balance', e.target.value)}
              className="border p-2 mb-2 w-full"
              placeholder="Balance"
            />
            <input
              type="number"
              value={debt.interestRate}
              onChange={(e) => handleDebtChange(debt.id, 'interestRate', e.target.value)}
              className="border p-2 mb-2 w-full"
              placeholder="Interest Rate (%)"
            />
            <input
              type="number"
              value={debt.minPayment}
              onChange={(e) => handleDebtChange(debt.id, 'minPayment', e.target.value)}
              className="border p-2 mb-2 w-full"
              placeholder="Minimum Payment"
            />
          </div>
        ))}
        <button onClick={handleAddDebt} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Debt
        </button>
      </div>
      <button onClick={calculateSnowball} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
        Calculate Snowball
      </button>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="monthsToPayOff" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
      <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4 flex items-center">
        <Download className="mr-2" /> Export CSV
      </button>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Using the Debt Snowball Method</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Focus on paying off the smallest debt first while making minimum payments on others.</li>
          <li>Once a debt is paid off, roll its payment into the next smallest debt.</li>
          <li>Stay motivated by tracking your progress regularly.</li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>What is the Debt Snowball method?</li>
          <li>How does this tool help me manage my debts?</li>
          <li>Can I export my data?</li>
        </ul>
      </section>
    </div>
  );
};

export default DebtSnowballTracker;


