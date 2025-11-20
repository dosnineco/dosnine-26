
// /pages/tools/monthly-expense-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = ['Housing', 'Food', 'Transportation', 'Utilities', 'Entertainment'];

// Types
interface Expense {
  category: string;
  amount: number;
}

// Main Component
const MonthlyExpenseTracker: NextPage = () => {
  // State
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_CATEGORIES.map(category => ({ category, amount: 0 })));
  const [total, setTotal] = useState<number>(0);

  // Handlers
  const handleAmountChange = (index: number, amount: number) => {
    const newExpenses = [...expenses];
    newExpenses[index].amount = amount;
    setExpenses(newExpenses);
    calculateTotal(newExpenses);
  };

  const calculateTotal = (expenses: Expense[]) => {
    const totalAmount = expenses.reduce((acc, expense) => acc + expense.amount, 0);
    setTotal(totalAmount);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Amount\n' +
      expenses.map(expense => `${expense.category},${expense.amount}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'monthly_expenses.csv');
  };

  // Chart Data
  const chartData = expenses.map(expense => ({
    name: expense.category,
    Amount: expense.amount,
  }));

  return (
    <>
      <Head>
        <title>Monthly Expense Tracker</title>
        <meta name="description" content="Track your monthly expenses with our free tool." />
        <meta name="keywords" content="expense tracker, personal finance, budgeting" />
        <link rel="canonical" href="https://yourdomain.com/tools/monthly-expense-tracker" />
      </Head>
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Monthly Expense Tracker</h1>
        <p className="text-base text-gray-700 mb-4">
          Welcome to your personal finance assistant. Track your monthly expenses effortlessly and gain insights into your spending habits.
        </p>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Enter Your Expenses</h2>
          {expenses.map((expense, index) => (
            <div key={index} className="mb-4">
              <label className="block text-base font-semibold mb-2">{expense.category}</label>
              <input
                type="number"
                value={expense.amount}
                onChange={(e) => handleAmountChange(index, parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
                aria-label={`Amount for ${expense.category}`}
              />
            </div>
          ))}
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">Total Monthly Expenses: ${total.toFixed(2)}</p>
          <BarChart width={500} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Amount" fill="#8884d8" />
          </BarChart>
          <button
            onClick={exportCSV}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4"
          >
            <Download className="inline-block mr-2" /> Export as CSV
          </button>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Tips for Managing Expenses</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>Review your expenses regularly to identify areas for savings.</li>
            <li>Set a monthly budget and stick to it.</li>
            <li>Use cash for discretionary spending to avoid overspending.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <FAQ />
        </section>
      </div>
    </>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How do I add a new category? - Currently, categories are fixed, but we are working on adding this feature.</li>
      <li>Can I track expenses for multiple months? - This tool is designed for monthly tracking, but you can export data for record-keeping.</li>
      <li>Is my data saved? - No, all data is stored locally in your browser and not saved on our servers.</li>
    </ul>
  </div>
);

export default MonthlyExpenseTracker;


