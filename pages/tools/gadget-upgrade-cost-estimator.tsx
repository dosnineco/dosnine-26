
// /pages/tools/gadget-upgrade-cost-estimator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface GadgetUpgradeCostEstimatorProps {}

interface Category {
  name: string;
  items: Item[];
}

interface Item {
  name: string;
  currentCost: number;
  upgradeCost: number;
}

const defaultCategories: Category[] = [
  {
    name: 'Smartphones',
    items: [
      { name: 'iPhone', currentCost: 700, upgradeCost: 1000 },
      { name: 'Samsung Galaxy', currentCost: 600, upgradeCost: 900 },
    ],
  },
  {
    name: 'Laptops',
    items: [
      { name: 'MacBook', currentCost: 1200, upgradeCost: 1500 },
      { name: 'Dell XPS', currentCost: 1000, upgradeCost: 1300 },
    ],
  },
];

const GadgetUpgradeCostEstimator: React.FC<GadgetUpgradeCostEstimatorProps> = () => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [results, setResults] = useState<{ name: string; current: number; upgrade: number }[]>([]);

  const calculateResults = () => {
    const newResults = categories.flatMap(category =>
      category.items.map(item => ({
        name: item.name,
        current: item.currentCost,
        upgrade: item.upgradeCost,
      }))
    );
    setResults(newResults);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Name,Current Cost,Upgrade Cost\n' +
      results.map(r => `${r.name},${r.current},${r.upgrade}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'gadget_upgrade_costs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Gadget Upgrade Cost Estimator</title>
        <meta name="description" content="Estimate the cost of upgrading your gadgets with our easy-to-use tool." />
        <meta name="keywords" content="gadget, upgrade, cost, estimator, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/gadget-upgrade-cost-estimator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Gadget Upgrade Cost Estimator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Gadget Upgrade Cost Estimator! This tool helps you calculate the potential costs of upgrading your gadgets. Simply input your current gadgets and their upgrade costs to get started.
      </p>

      <div className="mb-8">
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
            {category.items.map((item, idx) => (
              <div key={idx} className="flex justify-between mb-2">
                <span className="text-base">{item.name}</span>
                <span className="text-base">Current: ${item.currentCost}</span>
                <span className="text-base">Upgrade: ${item.upgradeCost}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={calculateResults}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6"
      >
        Calculate
      </button>

      {results.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={results}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="current" fill="#8884d8" />
              <Bar dataKey="upgrade" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>

          <button
            onClick={exportCSV}
            className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-6"
          >
            <Download className="mr-2" /> Export as CSV
          </button>

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Tips for Upgrading Your Gadgets</h3>
            <ul className="list-disc list-inside mb-4 text-base">
              <li>Consider the longevity and future-proofing of the gadget.</li>
              <li>Look for trade-in programs to offset costs.</li>
              <li>Research thoroughly to find the best deals.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How accurate is the cost estimation?</li>
          <li>Can I add more categories or items?</li>
          <li>How do I export the results?</li>
        </ul>
      </div>
    </div>
  );
};

export default GadgetUpgradeCostEstimator;


