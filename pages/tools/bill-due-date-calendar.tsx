
// /pages/tools/bill-due-date-calendar.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = ['Rent', 'Utilities', 'Credit Card', 'Loans'];

// Types
interface Bill {
  category: string;
  amount: number;
  dueDate: string;
}

interface ChartData {
  name: string;
  amount: number;
}

// Main Component
const BillDueDateCalendar: NextPage = () => {
  // State
  const [bills, setBills] = useState<Bill[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const addBill = () => {
    setBills([...bills, { category: '', amount: 0, dueDate: '' }]);
  };

  const updateBill = (index: number, field: keyof Bill, value: string | number) => {
    const updatedBills = [...bills];
    (updatedBills[index] as Bill)[field] = value as never;
    setBills(updatedBills);
    updateChartData(updatedBills);
  };

  const removeBill = (index: number) => {
    const updatedBills = bills.filter((_, i) => i !== index);
    setBills(updatedBills);
    updateChartData(updatedBills);
  };

  const updateChartData = (bills: Bill[]) => {
    const data = bills.map(bill => ({
      name: bill.category,
      amount: bill.amount,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + bills.map(b => `${b.category},${b.amount},${b.dueDate}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'bills.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Bill Due Date Calendar</title>
        <meta name="description" content="Track your bill due dates and manage your personal finances effectively." />
        <meta name="keywords" content="finance, bills, calendar, due dates, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/bill-due-date-calendar" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Bill Due Date Calendar</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to your personal Bill Due Date Calendar. Here, you can track your upcoming bills, manage due dates, and keep your finances in check.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Manage Your Bills</h2>
        {bills.map((bill, index) => (
          <div key={index} className="mb-4">
            <input
              type="text"
              placeholder="Category"
              value={bill.category}
              onChange={(e) => updateBill(index, 'category', e.target.value)}
              className="border p-2 mr-2"
            />
            <input
              type="number"
              placeholder="Amount"
              value={bill.amount}
              onChange={(e) => updateBill(index, 'amount', parseFloat(e.target.value))}
              className="border p-2 mr-2"
            />
            <input
              type="date"
              value={bill.dueDate}
              onChange={(e) => updateBill(index, 'dueDate', e.target.value)}
              className="border p-2 mr-2"
            />
            <button onClick={() => removeBill(index)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button onClick={addBill} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">Add Bill</button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Bill Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Bills</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Set reminders for due dates to avoid late fees.</li>
          <li>Prioritize paying off high-interest debts first.</li>
          <li>Consider consolidating bills to simplify payments.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How do I add a new bill? - Use the "Add Bill" button to include a new bill entry.</li>
          <li>Can I export my bill data? - Yes, click the "Export CSV" button to download your data.</li>
          <li>How do I remove a bill? - Click the "Remove" button next to the bill you wish to delete.</li>
        </ul>
      </section>

      <button onClick={exportCSV} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center">
        <Download className="mr-2" /> Export CSV
      </button>
    </div>
  );
};

export default BillDueDateCalendar;
