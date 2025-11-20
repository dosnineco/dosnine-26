
// /pages/tools/lifestyle-creep-checker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Housing', amount: 0 },
  { name: 'Transportation', amount: 0 },
  { name: 'Food', amount: 0 },
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
const LifestyleCreepChecker: NextPage = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleAmountChange = (index: number, value: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].amount = value;
    setCategories(updatedCategories);
  };

  const calculateResults = () => {
    const total = categories.reduce((acc, category) => acc + category.amount, 0);
    setResults(total);
    prepareChartData();
  };

  const prepareChartData = () => {
    const data = categories.map((category) => ({
      name: category.name,
      amount: category.amount,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,${categories
      .map((category) => `${category.name},${category.amount}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'lifestyle-creep-checker.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Lifestyle Creep Checker</title>
        <meta name="description" content="Check your lifestyle creep with our free tool." />
        <meta name="keywords" content="lifestyle creep, personal finance, budgeting tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/lifestyle-creep-checker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Lifestyle Creep Checker</h1>
      <p className="text-base text-gray-700 mb-4">
        Discover how your expenses have changed over time and identify areas where lifestyle creep might be affecting your finances.
      </p>

      <div>
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-xl font-semibold mb-2">{category.name}</label>
            <input
              type="number"
              value={category.amount}
              onChange={(e) => handleAmountChange(index, parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
              aria-label={`Amount for ${category.name}`}
            />
          </div>
        ))}
      </div>

      <button
        onClick={calculateResults}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6"
      >
        Calculate
      </button>

      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <p className="text-base text-gray-700 mb-4">Total Expenses: ${results}</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button
        onClick={exportCSV}
        className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-6"
      >
        <Download className="mr-2" />
        Export as CSV
      </button>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Tips</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Review your expenses regularly to identify unnecessary spending.</li>
        <li>Set a budget and stick to it to avoid lifestyle creep.</li>
        <li>Consider automating savings to prioritize financial goals.</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4 mt-8">FAQs</h2>
      <FAQSection />
    </div>
  );
};

// FAQ Component
const FAQSection: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>What is lifestyle creep? - It's the gradual increase in spending as your income rises.</li>
      <li>How can I prevent lifestyle creep? - By maintaining a budget and prioritizing savings.</li>
      <li>Why is it important to check for lifestyle creep? - To ensure you're not overspending and can meet financial goals.</li>
    </ul>
  </div>
);

export default LifestyleCreepChecker;


