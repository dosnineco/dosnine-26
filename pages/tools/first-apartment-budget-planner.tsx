
// /pages/tools/first-apartment-budget-planner.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Rent', amount: 0 },
  { name: 'Utilities', amount: 0 },
  { name: 'Groceries', amount: 0 },
  { name: 'Transportation', amount: 0 },
  { name: 'Entertainment', amount: 0 },
];

// Types
interface Category {
  name: string;
  amount: number;
}

// Main Component
const FirstApartmentBudgetPlanner: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalBudget, setTotalBudget] = useState<number>(0);

  // Handlers
  const handleAmountChange = (index: number, value: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].amount = value;
    setCategories(updatedCategories);
    calculateTotalBudget(updatedCategories);
  };

  const calculateTotalBudget = (categories: Category[]) => {
    const total = categories.reduce((sum, category) => sum + category.amount, 0);
    setTotalBudget(total);
  };

  const exportToCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${categories
      .map((cat) => `${cat.name},${cat.amount}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'budget.csv');
  };

  // Chart Data
  const chartData = categories.map((category) => ({
    name: category.name,
    amount: category.amount,
  }));

  return (
    <>
      <Head>
        <title>First Apartment Budget Planner</title>
        <meta name="description" content="Plan your budget for your first apartment with ease." />
        <meta name="keywords" content="budget, finance, apartment, planner" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/first-apartment-budget-planner" />
      </Head>
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">First Apartment Budget Planner</h1>
        <p className="text-base text-gray-700 mb-4">
          Planning your budget for your first apartment can be daunting. This tool helps you organize your expenses and ensure you're financially prepared.
        </p>
        <div className="mb-8">
          {categories.map((category, index) => (
            <div key={index} className="mb-4">
              <label className="block text-xl font-semibold mb-2">{category.name}</label>
              <input
                type="number"
                value={category.amount}
                onChange={(e) => handleAmountChange(index, parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          ))}
        </div>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Total Budget: ${totalBudget}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#3182ce" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <button
          onClick={exportToCSV}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          <Download className="inline-block mr-2" /> Export as CSV
        </button>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Tips for Budgeting</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>Track your spending regularly to avoid overspending.</li>
            <li>Set aside a portion of your income for savings.</li>
            <li>Review and adjust your budget monthly.</li>
          </ul>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>How do I start budgeting for my first apartment?</li>
            <li>What are common expenses I should consider?</li>
            <li>How can I save money on rent and utilities?</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default FirstApartmentBudgetPlanner;


