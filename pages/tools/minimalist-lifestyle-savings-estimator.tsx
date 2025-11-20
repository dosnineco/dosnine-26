// /pages/tools/minimalist-lifestyle-savings-estimator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { CSVLink } from 'react-csv';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Housing', amount: 0 },
  { name: 'Food', amount: 0 },
  { name: 'Transportation', amount: 0 },
  { name: 'Entertainment', amount: 0 },
];

// Types
interface Category {
  name: string;
  amount: number;
}

interface ChartData {
  name: string;
  value: number;
}

// Main Component
const MinimalistLifestyleSavingsEstimator: NextPage = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleCategoryChange = (index: number, amount: number) => {
    const newCategories = [...categories];
    newCategories[index].amount = amount;
    setCategories(newCategories);
    calculateResults(newCategories);
  };

  const calculateResults = (categories: Category[]) => {
    const totalSavings = categories.reduce((acc, category) => acc + category.amount, 0);
    setResults(totalSavings);
    prepareChartData(categories);
  };

  const prepareChartData = (categories: Category[]) => {
    const data = categories.map(category => ({
      name: category.name,
      value: category.amount,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvData = categories.map(category => ({
      Category: category.name,
      Amount: category.amount,
    }));
    return csvData;
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Minimalist Lifestyle Savings Estimator</title>
        <meta name="description" content="Estimate your savings with a minimalist lifestyle approach." />
        <meta name="keywords" content="savings, finance, minimalist lifestyle, budgeting" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/minimalist-lifestyle-savings-estimator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Minimalist Lifestyle Savings Estimator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Minimalist Lifestyle Savings Estimator. This tool helps you calculate potential savings by adopting a minimalist lifestyle. Adjust your spending in various categories to see how much you can save.
      </p>

      <div className="mb-8">
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-xl font-semibold mb-2">{category.name}</label>
            <input
              type="number"
              value={category.amount}
              onChange={(e) => handleCategoryChange(index, parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
              aria-label={`Amount for ${category.name}`}
            />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Total Estimated Savings: ${results.toFixed(2)}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Maximizing Savings</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider downsizing your living space to reduce housing costs.</li>
          <li>Plan meals and cook at home to save on food expenses.</li>
          <li>Use public transportation or carpool to cut down on transportation costs.</li>
          <li>Find free or low-cost entertainment options in your community.</li>
        </ul>
      </div>

      <div className="mb-8">
        <CSVLink data={exportCSV()} filename={"savings-estimator.csv"} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          <Download className="inline-block mr-2" /> Export Results as CSV
        </CSVLink>
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
      <li>How accurate is the savings estimation?</li>
      <p className="text-base text-gray-700 mb-4">The estimation is based on the inputs you provide and is meant to give a general idea of potential savings.</p>
      <li>Can I add more categories?</li>
      <p className="text-base text-gray-700 mb-4">Currently, the tool supports a fixed set of categories, but future updates may allow for more customization.</p>
      <li>Is my data saved?</li>
      <p className="text-base text-gray-700 mb-4">No, all calculations are done locally in your browser and no data is saved or sent to a server.</p>
    </ul>
  </div>
);

export default MinimalistLifestyleSavingsEstimator;


