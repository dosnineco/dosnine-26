

// /pages/tools/customer-acquisition-cost-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Marketing', cost: 0 },
  { name: 'Sales', cost: 0 },
  { name: 'Support', cost: 0 },
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
const CustomerAcquisitionCostCalculator: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleCostChange = (index: number, cost: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].cost = cost;
    setCategories(updatedCategories);
    calculateTotalCost(updatedCategories);
  };

  const calculateTotalCost = (categories: Category[]) => {
    const total = categories.reduce((sum, category) => sum + category.cost, 0);
    setTotalCost(total);
    prepareChartData(categories);
  };

  const prepareChartData = (categories: Category[]) => {
    const data = categories.map(category => ({
      name: category.name,
      cost: category.cost,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${categories
      .map(cat => `${cat.name},${cat.cost}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'customer_acquisition_cost.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Customer Acquisition Cost Calculator</title>
        <meta name="description" content="Calculate your customer acquisition cost with ease." />
        <meta name="keywords" content="customer acquisition, cost calculator, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/customer-acquisition-cost-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Customer Acquisition Cost Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Customer Acquisition Cost Calculator. This tool helps you calculate the total cost of acquiring new customers by summing up your marketing, sales, and support expenses.
      </p>

      <div>
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-xl font-semibold mb-2">{category.name} Cost</label>
            <input
              type="number"
              value={category.cost}
              onChange={(e) => handleCostChange(index, parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              aria-label={`${category.name} Cost`}
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Total Cost: ${totalCost}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="#3182ce" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button
        onClick={exportCSV}
        className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
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
    <h3 className="text-xl font-semibold mb-4">Tips for Reducing Customer Acquisition Cost</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Focus on customer retention to reduce churn.</li>
      <li>Optimize your marketing strategies for better ROI.</li>
      <li>Leverage referral programs to acquire new customers.</li>
    </ul>
  </div>
);

// FAQ Section Component
const FAQSection: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>What is Customer Acquisition Cost?</strong>
        <p className="text-base text-gray-700 mb-4">
          Customer Acquisition Cost (CAC) is the total cost associated with acquiring a new customer, including marketing, sales, and support expenses.
        </p>
      </li>
      <li>
        <strong>How can I reduce my CAC?</strong>
        <p className="text-base text-gray-700 mb-4">
          You can reduce CAC by optimizing your marketing strategies, improving customer retention, and leveraging word-of-mouth and referral programs.
        </p>
      </li>
    </ul>
  </div>
);

export default CustomerAcquisitionCostCalculator;


