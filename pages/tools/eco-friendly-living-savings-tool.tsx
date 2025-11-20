
// /pages/tools/eco-friendly-living-savings-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Energy', items: ['Solar Panels', 'LED Bulbs'] },
  { name: 'Transport', items: ['Electric Car', 'Public Transport'] },
];

// Types
interface UserInput {
  category: string;
  item: string;
  cost: number;
  savings: number;
}

// Main Component
const EcoFriendlyLivingSavingsTool: React.FC = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleAddInput = () => {
    setUserInputs([...userInputs, { category: '', item: '', cost: 0, savings: 0 }]);
  };

  const handleInputChange = <K extends keyof UserInput>(index: number, field: K, value: UserInput[K]) => {
    const newInputs = [...userInputs];
    newInputs[index][field] = value;
    setUserInputs(newInputs);
  };

  const calculateResults = () => {
    const data = userInputs.map(input => ({
      name: input.item,
      Cost: input.cost,
      Savings: input.savings,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + userInputs.map(input => `${input.category},${input.item},${input.cost},${input.savings}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'eco-friendly-living-savings.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Eco-Friendly Living Savings Tool</title>
        <meta name="description" content="Calculate your savings with eco-friendly living choices." />
        <meta name="keywords" content="eco-friendly, savings, personal finance, tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/eco-friendly-living-savings-tool" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Eco-Friendly Living Savings Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Discover how much you can save by making eco-friendly choices in your daily life. Use this tool to input your expenses and see potential savings.
      </p>

      <div className="mb-6">
        {userInputs.map((input, index) => (
          <div key={index} className="mb-4">
            <select
              className="mb-2 p-2 border rounded w-full"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
            >
              <option value="">Select Category</option>
              {DEFAULT_CATEGORIES.map(category => (
                <option key={category.name} value={category.name}>{category.name}</option>
              ))}
            </select>
            <input
              type="text"
              className="mb-2 p-2 border rounded w-full"
              placeholder="Item"
              value={input.item}
              onChange={(e) => handleInputChange(index, 'item', e.target.value)}
            />
            <input
              type="number"
              className="mb-2 p-2 border rounded w-full"
              placeholder="Cost"
              value={input.cost}
              onChange={(e) => handleInputChange(index, 'cost', parseFloat(e.target.value))}
            />
            <input
              type="number"
              className="mb-2 p-2 border rounded w-full"
              placeholder="Savings"
              value={input.savings}
              onChange={(e) => handleInputChange(index, 'savings', parseFloat(e.target.value))}
            />
          </div>
        ))}
        <button onClick={handleAddInput} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Item
        </button>
      </div>

      <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6">
        Calculate Savings
      </button>

      <BarChart width={600} height={300} data={chartData} className="mx-auto mb-6">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="Cost" fill="#8884d8" />
        <Bar dataKey="Savings" fill="#82ca9d" />
      </BarChart>

      <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6 flex items-center">
        <Download className="mr-2" /> Export as CSV
      </button>

      <h2 className="text-2xl font-semibold mb-4">Tips for Eco-Friendly Living</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Consider renewable energy sources like solar panels.</li>
        <li>Use energy-efficient appliances to reduce electricity consumption.</li>
        <li>Opt for public transport or carpooling to reduce carbon footprint.</li>
        <li>Reduce, reuse, and recycle to minimize waste.</li>
      </ul>

      <FAQSection />
    </div>
  );
};

// FAQ Component
const FAQSection: React.FC = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">How does this tool work?</h3>
      <p className="text-base text-gray-700 mb-4">
        You can input your current expenses and potential savings from eco-friendly alternatives. The tool calculates and compares these values.
      </p>
    </div>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">Can I export my results?</h3>
      <p className="text-base text-gray-700 mb-4">
        Yes, you can export your results as a CSV file for further analysis.
      </p>
    </div>
  </div>
);

export default EcoFriendlyLivingSavingsTool;


