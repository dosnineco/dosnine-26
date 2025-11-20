
// /pages/tools/daily-expense-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities'];

// Types
interface Expense {
  category: string;
  amount: number;
}

// Main Component
const DailyExpenseTracker: React.FC = () => {
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);

  // Handlers
  const addExpense = () => {
    if (category && amount > 0) {
      setExpenses([...expenses, { category, amount }]);
      setCategory('');
      setAmount(0);
    }
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Amount\n' +
      expenses.map(e => `${e.category},${e.amount}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'expenses.csv');
  };

  // Chart Data
  const chartData = DEFAULT_CATEGORIES.map(cat => ({
    category: cat,
    amount: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
  }));

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Daily Expense Tracker</title>
        <meta name="description" content="Track your daily expenses effortlessly with our free tool." />
        <meta name="keywords" content="expense tracker, personal finance, budgeting" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/daily-expense-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Daily Expense Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to your personal finance assistant. Track your daily expenses and gain insights into your spending habits.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Add Expense</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Amount"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={addExpense}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Expense Chart</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Expenses</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Set a budget for each category and stick to it.</li>
          <li>Review your expenses weekly to identify patterns.</li>
          <li>Use cash for discretionary spending to limit overspending.</li>
        </ul>
      </div>

      <div className="mb-8">
        <button
          onClick={exportCSV}
          className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          <Download className="mr-2" /> Export as CSV
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How do I add a new category? - Simply type the category name in the input field.</li>
          <li>Can I edit an expense? - Currently, editing is not supported. Please remove and re-add the expense.</li>
          <li>How do I export my data? - Click the "Export as CSV" button to download your expenses.</li>
        </ul>
      </div>
    </div>
  );
};

export default DailyExpenseTracker;


