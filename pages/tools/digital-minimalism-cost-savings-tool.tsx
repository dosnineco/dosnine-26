
// /pages/tools/digital-minimalism-cost-savings-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Streaming Services', cost: 15 },
  { name: 'Gym Membership', cost: 30 },
  { name: 'Coffee Shops', cost: 20 },
];

// Types
interface Category {
  name: string;
  cost: number;
}

interface ChartData {
  name: string;
  cost: number;
}

// Main Component
const DigitalMinimalismCostSavingsTool: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalSavings, setTotalSavings] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleAddCategory = () => {
    setCategories([...categories, { name: '', cost: 0 }]);
  };

  const handleCategoryChange = (index: number, field: keyof Category, value: string | number) => {
    const updatedCategories = categories.map((category, i) =>
      i === index ? { ...category, [field]: value } : category
    );
    setCategories(updatedCategories);
  };

  const calculateSavings = () => {
    const savings = categories.reduce((acc, category) => acc + category.cost, 0);
    setTotalSavings(savings);
    setChartData(categories.map(category => ({ name: category.name, cost: category.cost })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${categories
      .map(category => `${category.name},${category.cost}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'cost-savings.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Digital Minimalism Cost Savings Tool</title>
        <meta name="description" content="Calculate your potential savings by minimizing digital expenses." />
        <meta name="keywords" content="digital minimalism, cost savings, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/digital-minimalism-cost-savings-tool" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Digital Minimalism Cost Savings Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Discover how much you can save by cutting down on unnecessary digital expenses. Enter your current expenses below.
      </p>

      <div className="mb-6">
        {categories.map((category, index) => (
          <div key={index} className="flex items-center mb-4">
            <input
              type="text"
              value={category.name}
              onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
              placeholder="Category Name"
              className="mr-2 px-3 py-2 border rounded-lg w-1/2"
            />
            <input
              type="number"
              value={category.cost}
              onChange={(e) => handleCategoryChange(index, 'cost', parseFloat(e.target.value))}
              placeholder="Cost"
              className="mr-2 px-3 py-2 border rounded-lg w-1/4"
            />
          </div>
        ))}
        <button onClick={handleAddCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Add Category
        </button>
      </div>

      <button onClick={calculateSavings} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-6">
        Calculate Savings
      </button>

      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <p className="text-base text-gray-700 mb-4">Total Potential Savings: ${totalSavings}</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="cost" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mt-6 flex items-center">
        <Download className="mr-2" /> Export as CSV
      </button>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Tips for Maximizing Savings</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Review your subscriptions regularly and cancel those you don't use.</li>
        <li>Consider sharing subscriptions with family or friends to cut costs.</li>
        <li>Look for free alternatives to paid services.</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Frequently Asked Questions</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>How does this tool calculate savings?</li>
        <li>Can I add more categories?</li>
        <li>Is my data saved anywhere?</li>
      </ul>
    </div>
  );
};

export default DigitalMinimalismCostSavingsTool;


