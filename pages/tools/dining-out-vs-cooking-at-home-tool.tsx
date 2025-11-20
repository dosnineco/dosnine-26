// /pages/tools/dining-out-vs-cooking-at-home-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { NextPage } from 'next';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Dining Out', cost: 0 },
  { name: 'Cooking at Home', cost: 0 },
];

// Types
interface Category {
  name: string;
  cost: number;
}

// Main Component
const DiningOutVsCookingAtHomeTool: NextPage = () => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [results, setResults] = useState<{ [key: string]: number }>({});
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleCostChange = (index: number, cost: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].cost = cost;
    setCategories(updatedCategories);
  };

  const calculateResults = () => {
    const totalCosts = categories.reduce((acc, category) => {
      acc[category.name] = category.cost;
      return acc;
    }, {} as { [key: string]: number });

    setResults(totalCosts);
    setChartData(Object.entries(totalCosts).map(([name, cost]) => ({ name, cost })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${categories
      .map((c) => `${c.name},${c.cost}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'dining-out-vs-cooking-at-home.csv');
  };

  return (
    <>
      <Head>
        <title>Dining Out vs Cooking at Home Tool</title>
        <meta name="description" content="Compare the costs of dining out versus cooking at home with our interactive tool." />
        <meta name="keywords" content="personal finance, dining out, cooking at home, cost comparison" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/dining-out-vs-cooking-at-home-tool" />
      </Head>
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Dining Out vs Cooking at Home Tool</h1>
        <p className="text-base text-gray-700 mb-4">
          Welcome to the Dining Out vs Cooking at Home Tool. This tool helps you compare the costs of dining out versus cooking at home. Simply enter your expenses, and we'll do the rest!
        </p>

        <div className="mb-8">
          {categories.map((category, index) => (
            <div key={index} className="mb-4">
              <label className="block text-xl font-semibold mb-2">{category.name}</label>
              <input
                type="number"
                value={category.cost}
                onChange={(e) => handleCostChange(index, parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded"
                aria-label={`Cost for ${category.name}`}
              />
            </div>
          ))}
          <button
            onClick={calculateResults}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Calculate
          </button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Results</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            <button
              onClick={exportCSV}
              className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
            >
              <Download className="mr-2" /> Export CSV
            </button>
          </div>
        )}

        <TipsSection />
        <FAQSection />
      </div>
    </>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Saving Money</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Plan your meals ahead to avoid last-minute dining out.</li>
      <li>Buy groceries in bulk to save on costs.</li>
      <li>Try cooking new recipes at home to make it more enjoyable.</li>
    </ul>
  </div>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>How accurate is this tool?</strong> The tool provides estimates based on the costs you input. Actual savings may vary.
      </li>
      <li>
        <strong>Can I add more categories?</strong> Currently, the tool supports two categories, but future updates may allow more customization.
      </li>
    </ul>
  </div>
);

export default DiningOutVsCookingAtHomeTool;


