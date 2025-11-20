
// /pages/tools/luxury-vs-generic-product-cost-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Clothing', luxury: 100, generic: 50 },
  { name: 'Electronics', luxury: 500, generic: 300 },
];

// Types
interface Category {
  name: string;
  luxury: number;
  generic: number;
}

interface UserInput {
  categories: Category[];
}

// Main Component
const LuxuryVsGenericProductCostTool: React.FC = () => {
  const [userInput, setUserInput] = useState<UserInput>({ categories: DEFAULT_CATEGORIES });
  const [results, setResults] = useState<{ totalLuxury: number; totalGeneric: number }>({ totalLuxury: 0, totalGeneric: 0 });

  // Handlers
  const handleInputChange = (index: number, field: 'luxury' | 'generic', value: number) => {
    const updatedCategories = [...userInput.categories];
    updatedCategories[index][field] = value;
    setUserInput({ categories: updatedCategories });
  };

  const calculateResults = () => {
    const totalLuxury = userInput.categories.reduce((sum, category) => sum + category.luxury, 0);
    const totalGeneric = userInput.categories.reduce((sum, category) => sum + category.generic, 0);
    setResults({ totalLuxury, totalGeneric });
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Luxury,Generic\n${userInput.categories
      .map((cat) => `${cat.name},${cat.luxury},${cat.generic}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'luxury-vs-generic.csv');
  };

  // Chart Data
  const chartData = userInput.categories.map((category) => ({
    name: category.name,
    Luxury: category.luxury,
    Generic: category.generic,
  }));

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Luxury vs Generic Product Cost Tool</title>
        <meta name="description" content="Compare the costs of luxury and generic products to make informed financial decisions." />
        <meta name="keywords" content="personal finance, luxury, generic, cost comparison" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/luxury-vs-generic-product-cost-tool" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Luxury vs Generic Product Cost Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Luxury vs Generic Product Cost Tool. Here, you can compare the costs of luxury and generic products to make informed financial decisions. Simply input your data and see the results.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Input Your Data</h2>
        {userInput.categories.map((category, index) => (
          <div key={index} className="mb-4">
            <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
            <div className="flex space-x-4">
              <div>
                <label className="block text-gray-700">Luxury Cost</label>
                <input
                  type="number"
                  value={category.luxury}
                  onChange={(e) => handleInputChange(index, 'luxury', parseFloat(e.target.value))}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700">Generic Cost</label>
                <input
                  type="number"
                  value={category.generic}
                  onChange={(e) => handleInputChange(index, 'generic', parseFloat(e.target.value))}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
            </div>
          </div>
        ))}
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Calculate
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Total Luxury Cost: ${results.totalLuxury}</p>
        <p className="text-base text-gray-700 mb-4">Total Generic Cost: ${results.totalGeneric}</p>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Luxury" fill="#8884d8" />
            <Bar dataKey="Generic" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>

        <button onClick={exportCSV} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center">
          <Download className="mr-2" /> Export as CSV
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider the long-term value of luxury items versus their initial cost.</li>
          <li>Generic products can often provide similar functionality at a lower price.</li>
          <li>Balance your spending between luxury and generic to optimize your budget.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How do I decide between luxury and generic products?</li>
          <li>What factors should I consider when comparing costs?</li>
          <li>Can I add more categories to the tool?</li>
        </ul>
      </section>
    </div>
  );
};

export default LuxuryVsGenericProductCostTool;


