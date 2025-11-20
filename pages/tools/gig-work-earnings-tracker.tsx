// /pages/tools/gig-work-earnings-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = ['Driving', 'Delivery', 'Freelancing'];

// Types
interface EarningsInput {
  category: string;
  amount: number;
}

interface ChartData {
  name: string;
  earnings: number;
}

// Main Component
const GigWorkEarningsTracker: NextPage = () => {
  // State
  const [earnings, setEarnings] = useState<EarningsInput[]>([]);
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);

  // Handlers
  const handleAddEarnings = () => {
    if (category && amount > 0) {
      setEarnings([...earnings, { category, amount }]);
      setCategory('');
      setAmount(0);
    }
  };

  const handleExportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Amount\n' +
      earnings.map(e => `${e.category},${e.amount}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'earnings.csv');
  };

  // Calculation Logic
  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);

  // Chart Data
  const chartData: ChartData[] = earnings.map(e => ({
    name: e.category,
    earnings: e.amount,
  }));

  // UI Rendering
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Gig Work Earnings Tracker</title>
        <meta name="description" content="Track your earnings from various gig work categories." />
        <meta name="keywords" content="gig work, earnings tracker, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/gig-work-earnings-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Gig Work Earnings Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Gig Work Earnings Tracker! This tool helps you keep track of your earnings from various gig work categories. Simply enter your earnings below and visualize your income distribution.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Add Your Earnings</h2>
        <div className="flex flex-col md:flex-row items-center mb-4">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="border rounded-lg p-2 mb-2 md:mb-0 md:mr-2 flex-grow"
            aria-label="Category"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Amount"
            className="border rounded-lg p-2 mb-2 md:mb-0 md:mr-2 flex-grow"
            aria-label="Amount"
          />
          <button
            onClick={handleAddEarnings}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Earnings Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="earnings" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-base text-gray-700 mt-4">Total Earnings: ${totalEarnings}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Maximizing Earnings</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Track your expenses to understand your net income.</li>
          <li>Explore different gig categories to diversify your income.</li>
          <li>Set financial goals to stay motivated and focused.</li>
        </ul>
      </div>

      <div className="mb-8">
        <button
          onClick={handleExportCSV}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          <Download className="inline-block mr-2" /> Export as CSV
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQ />
      </div>
    </div>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How do I add a new category? - Simply type the category name in the input field and add your earnings.</li>
      <li>Can I export my data? - Yes, you can export your earnings data as a CSV file.</li>
      <li>Is my data saved? - Currently, the data is not saved and will be lost on page refresh.</li>
    </ul>
  </div>
);

export default GigWorkEarningsTracker;


