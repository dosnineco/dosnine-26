

// /pages/tools/coffee-shop-spending-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { CoffeeIcon } from 'lucide-react';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Coffee', cost: 5 },
  { name: 'Pastry', cost: 3 },
];

// Types
interface Category {
  name: string;
  cost: number;
}

interface UserInput {
  category: string;
  quantity: number;
}

// Main Component
const CoffeeShopSpendingCalculator: NextPage = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleAddCategory = () => {
    setUserInputs([...userInputs, { category: '', quantity: 0 }]);
  };

  const handleInputChange = (index: number, field: keyof UserInput, value: string | number) => {
    const newInputs: UserInput[] = [...userInputs];
    if (field === 'quantity') {
      newInputs[index][field] = Number(value);
    } else if (field === 'category') {
      newInputs[index][field] = String(value);
    }
    setUserInputs(newInputs);
  };

  const calculateResults = () => {
    const total = userInputs.reduce((acc, input) => {
      const category = DEFAULT_CATEGORIES.find(cat => cat.name === input.category);
      return acc + (category ? category.cost * input.quantity : 0);
    }, 0);
    setResults(total);
    setChartData(userInputs.map(input => ({
      name: input.category,
      value: input.quantity,
    })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Quantity\n${userInputs.map(input => `${input.category},${input.quantity}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'coffee-shop-spending.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Coffee Shop Spending Calculator</title>
        <meta name="description" content="Calculate your coffee shop spending with our free tool." />
        <meta name="keywords" content="coffee, spending, calculator, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/coffee-shop-spending-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Coffee Shop Spending Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Ever wondered how much you spend at your favorite coffee shop? Use this calculator to find out!
      </p>

      <div className="mb-4">
        {userInputs.map((input, index) => (
          <div key={index} className="flex items-center mb-2">
            <select
              className="mr-2 p-2 border rounded"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
            >
              <option value="">Select Category</option>
              {DEFAULT_CATEGORIES.map((cat, idx) => (
                <option key={idx} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <input
              type="number"
              className="mr-2 p-2 border rounded"
              value={input.quantity}
              onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
              placeholder="Quantity"
            />
          </div>
        ))}
        <button
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          onClick={handleAddCategory}
        >
          Add Category
        </button>
      </div>

      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4"
        onClick={calculateResults}
      >
        Calculate
      </button>

      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <p className="text-base text-gray-700 mb-4">Total Spending: ${results.toFixed(2)}</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4"
        onClick={exportCSV}
      >
        <Download className="inline-block mr-2" /> Export as CSV
      </button>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Tips</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Track your spending regularly to identify patterns.</li>
        <li>Consider setting a budget for your coffee shop visits.</li>
        <li>Explore making coffee at home to save money.</li>
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
      <li>How accurate is this calculator?</li>
      <p className="text-base text-gray-700 mb-4">The calculator provides an estimate based on the inputs you provide. Actual spending may vary.</p>
      <li>Can I add more categories?</li>
      <p className="text-base text-gray-700 mb-4">Yes, you can add as many categories as you like using the "Add Category" button.</p>
    </ul>
  </div>
);

export default CoffeeShopSpendingCalculator;
