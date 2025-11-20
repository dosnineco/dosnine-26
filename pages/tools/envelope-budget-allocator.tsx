
// /pages/tools/envelope-budget-allocator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Housing', amount: 0 },
  { name: 'Food', amount: 0 },
  { name: 'Transportation', amount: 0 },
  { name: 'Utilities', amount: 0 },
  { name: 'Entertainment', amount: 0 },
];

// Types
interface Category {
  name: string;
  amount: number;
}

interface ChartData {
  name: string;
  amount: number;
}

// Main Component
const EnvelopeBudgetAllocator: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleCategoryChange = (index: number, amount: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].amount = amount;
    setCategories(updatedCategories);
    updateChartData(updatedCategories);
  };

  const updateChartData = (categories: Category[]) => {
    const data = categories.map((category) => ({
      name: category.name,
      amount: category.amount,
    }));
    setChartData(data);
  };

  const handleExportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${categories
      .map((c) => `${c.name},${c.amount}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'budget.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Envelope Budget Allocator</title>
        <meta name="description" content="A free tool to help you allocate your budget effectively using the envelope method." />
        <meta name="keywords" content="budget, finance, envelope method, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/envelope-budget-allocator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Envelope Budget Allocator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Envelope Budget Allocator! This tool helps you manage your finances by allocating your budget into different categories using the envelope method.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Budget Categories</h2>
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base font-semibold mb-2">{category.name}</label>
            <input
              type="number"
              value={category.amount}
              onChange={(e) => handleCategoryChange(index, parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              aria-label={`Amount for ${category.name}`}
            />
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#3182ce" />
          </BarChart>
        </ResponsiveContainer>
        <button
          onClick={handleExportCSV}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          <Download className="inline-block mr-2" /> Export as CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Review your budget regularly to ensure it aligns with your financial goals.</li>
          <li>Adjust categories as your financial situation changes.</li>
          <li>Consider setting aside a small amount for unexpected expenses.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">What is the envelope method?</h3>
          <p className="text-base text-gray-700 mb-4">
            The envelope method is a budgeting technique where you allocate a specific amount of cash for different spending categories.
          </p>
        </div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">How can this tool help me?</h3>
          <p className="text-base text-gray-700 mb-4">
            This tool helps you visualize and manage your budget by breaking it down into categories, making it easier to track and control your spending.
          </p>
        </div>
      </section>
    </div>
  );
};

export default EnvelopeBudgetAllocator;


