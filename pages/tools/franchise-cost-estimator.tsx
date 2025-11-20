
// /pages/tools/franchise-cost-estimator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { NextPage } from 'next';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Initial Franchise Fee', cost: 30000 },
  { name: 'Equipment', cost: 15000 },
  { name: 'Inventory', cost: 10000 },
  { name: 'Marketing', cost: 5000 },
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
const FranchiseCostEstimator: NextPage = () => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalCost, setTotalCost] = useState<number>(calculateTotalCost(DEFAULT_CATEGORIES));

  // Handlers
  const handleCostChange = (index: number, cost: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].cost = cost;
    setCategories(updatedCategories);
    setTotalCost(calculateTotalCost(updatedCategories));
  };

  const addCategory = () => {
    setCategories([...categories, { name: 'New Category', cost: 0 }]);
  };

  const removeCategory = (index: number) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    setCategories(updatedCategories);
    setTotalCost(calculateTotalCost(updatedCategories));
  };

  const exportCSV = () => {
    const csvContent = categories.map(cat => `${cat.name},${cat.cost}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'franchise-costs.csv');
  };

  // Calculation Logic
  function calculateTotalCost(categories: Category[]): number {
    return categories.reduce((acc, category) => acc + category.cost, 0);
  }

  // Chart Data
  const chartData: ChartData[] = categories.map(category => ({
    name: category.name,
    cost: category.cost,
  }));

  // UI Rendering
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Franchise Cost Estimator</title>
        <meta name="description" content="Estimate the costs of starting a franchise with our easy-to-use tool." />
        <meta name="keywords" content="franchise, cost estimator, business, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/franchise-cost-estimator" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Franchise Cost Estimator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Franchise Cost Estimator! This tool helps you estimate the initial costs of starting a franchise. Simply adjust the costs for each category below, and see your total estimated cost.
      </p>
      <div className="mb-4">
        {categories.map((category, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              value={category.name}
              onChange={(e) => {
                const updatedCategories = [...categories];
                updatedCategories[index].name = e.target.value;
                setCategories(updatedCategories);
              }}
              className="flex-1 mr-2 px-2 py-1 border rounded"
            />
            <input
              type="number"
              value={category.cost}
              onChange={(e) => handleCostChange(index, parseFloat(e.target.value))}
              className="w-24 mr-2 px-2 py-1 border rounded"
            />
            <button
              onClick={() => removeCategory(index)}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Add Category
        </button>
      </div>
      <h2 className="text-2xl font-semibold mb-4">Total Estimated Cost: ${totalCost}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="cost" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
      <button onClick={exportCSV} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
        <Download className="inline-block mr-2" /> Export as CSV
      </button>
      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Section Component
const TipsSection: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Tips for Estimating Franchise Costs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Research similar franchises to get a realistic cost estimate.</li>
      <li>Consider hidden costs such as legal fees and insurance.</li>
      <li>Plan for ongoing expenses like royalties and marketing fees.</li>
    </ul>
  </div>
);

// FAQ Section Component
const FAQSection: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>What is a franchise cost estimator?</strong>
        <p className="text-base text-gray-700 mb-4">
          A franchise cost estimator is a tool that helps you calculate the initial costs associated with starting a franchise.
        </p>
      </li>
      <li>
        <strong>How accurate are these estimates?</strong>
        <p className="text-base text-gray-700 mb-4">
          The estimates provided are based on typical costs and should be used as a guideline. Actual costs may vary.
        </p>
      </li>
    </ul>
  </div>
);

export default FranchiseCostEstimator;


