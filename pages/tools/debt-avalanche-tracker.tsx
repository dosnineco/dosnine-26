
// /pages/tools/debt-avalanche-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_DEBTS = [
  { id: 1, name: 'Credit Card', balance: 5000, interestRate: 18.99, minPayment: 100 },
  { id: 2, name: 'Student Loan', balance: 15000, interestRate: 5.5, minPayment: 150 },
];

// Types
interface Debt {
  id: number;
  name: string;
  balance: number;
  interestRate: number;
  minPayment: number;
}

interface ChartData {
  name: string;
  balance: number;
}

// Main Component
const DebtAvalancheTracker: NextPage = () => {
  const [debts, setDebts] = useState<Debt[]>(DEFAULT_DEBTS);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totalInterest, setTotalInterest] = useState<number>(0);

  // Handlers
  const handleAddDebt = () => {
    setDebts([...debts, { id: debts.length + 1, name: '', balance: 0, interestRate: 0, minPayment: 0 }]);
  };

  const handleDebtChange = (id: number, field: keyof Debt, value: string | number) => {
    setDebts(debts.map(debt => (debt.id === id ? { ...debt, [field]: value } : debt)));
  };

  const calculateDebtAvalanche = () => {
    // Calculation logic for Debt Avalanche
    let totalInterestAccrued = 0;
    const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);
    const updatedChartData: ChartData[] = sortedDebts.map(debt => {
      const interest = (debt.balance * debt.interestRate) / 100;
      totalInterestAccrued += interest;
      return { name: debt.name, balance: debt.balance };
    });
    setChartData(updatedChartData);
    setTotalInterest(totalInterestAccrued);
  };

  const exportToCSV = () => {
    const csvContent = debts.map(debt => `${debt.name},${debt.balance},${debt.interestRate},${debt.minPayment}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'debt_avalanche.csv');
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Debt Avalanche Tracker</title>
        <meta name="description" content="Track and manage your debts effectively using the Debt Avalanche method." />
        <meta name="keywords" content="debt, finance, avalanche, tracker, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/debt-avalanche-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Debt Avalanche Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Debt Avalanche Tracker! This tool helps you manage and pay off your debts efficiently by focusing on the highest interest rates first.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Debts</h2>
        {debts.map(debt => (
          <div key={debt.id} className="mb-4">
            <input
              type="text"
              value={debt.name}
              onChange={e => handleDebtChange(debt.id, 'name', e.target.value)}
              placeholder="Debt Name"
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              value={debt.balance}
              onChange={e => handleDebtChange(debt.id, 'balance', parseFloat(e.target.value))}
              placeholder="Balance"
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              value={debt.interestRate}
              onChange={e => handleDebtChange(debt.id, 'interestRate', parseFloat(e.target.value))}
              placeholder="Interest Rate"
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              value={debt.minPayment}
              onChange={e => handleDebtChange(debt.id, 'minPayment', parseFloat(e.target.value))}
              placeholder="Minimum Payment"
              className="border p-2 mb-2 w-full"
            />
          </div>
        ))}
        <button onClick={handleAddDebt} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Debt
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <button onClick={calculateDebtAvalanche} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Calculate
        </button>
        <p className="text-base text-gray-700 mb-4">Total Interest Accrued: ${totalInterest.toFixed(2)}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="balance" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button onClick={exportToCSV} className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4">
          <Download className="mr-2" /> Export CSV
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Focus on paying off debts with the highest interest rates first.</li>
          <li>Make at least the minimum payment on all debts to avoid penalties.</li>
          <li>Consider consolidating debts to lower interest rates.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>What is the Debt Avalanche method? - It's a strategy to pay off debts by focusing on the highest interest rates first.</li>
          <li>How does this tool help? - It calculates the total interest and helps you prioritize your payments.</li>
        </ul>
      </section>
    </div>
  );
};

export default DebtAvalancheTracker;


