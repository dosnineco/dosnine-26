
// /pages/tools/dollar-cost-averaging-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Stocks', 'Bonds', 'Cryptocurrency'];

// Types
interface UserInput {
  category: string;
  amount: number;
  frequency: number;
}

// Main Component
const DollarCostAveragingCalculator: React.FC = () => {
  // State
  const [inputs, setInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleAddInput = () => {
    setInputs([...inputs, { category: '', amount: 0, frequency: 0 }]);
  };

  const handleInputChange = (index: number, field: keyof UserInput, value: string | number) => {
    const newInputs = [...inputs];
    if (field === 'amount' || field === 'frequency') {
      newInputs[index][field] = typeof value === 'string' ? parseFloat(value) : value;
    } else if (field === 'category') {
      newInputs[index][field] = value as string;
    }
    setInputs(newInputs);
  };

  const calculateResults = () => {
    const newResults = inputs.map(input => input.amount * input.frequency);
    setResults(newResults);
    setChartData(inputs.map((input, index) => ({ name: input.category, value: newResults[index] })));
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + inputs.map(input => `${input.category},${input.amount},${input.frequency}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'dollar-cost-averaging-results.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Dollar-Cost Averaging Calculator</title>
        <meta name="description" content="Calculate your investment strategy using the Dollar-Cost Averaging method." />
        <meta name="keywords" content="Dollar-Cost Averaging, Investment, Finance, Calculator" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/dollar-cost-averaging-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Dollar-Cost Averaging Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Dollar-Cost Averaging Calculator. This tool helps you plan your investments by spreading out your purchases over time.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Investment Inputs</h2>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base mb-2">
              Category
              <select
                className="block w-full mt-1"
                value={input.category}
                onChange={(e) => handleInputChange(index, 'category', e.target.value)}
              >
                <option value="">Select Category</option>
                {DEFAULT_CATEGORIES.map((category, idx) => (
                  <option key={idx} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="block text-base mb-2">
              Amount
              <input
                type="number"
                className="block w-full mt-1"
                value={input.amount}
                onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
              />
            </label>
            <label className="block text-base mb-2">
              Frequency (times per year)
              <input
                type="number"
                className="block w-full mt-1"
                value={input.frequency}
                onChange={(e) => handleInputChange(index, 'frequency', e.target.value)}
              />
            </label>
          </div>
        ))}
        <button onClick={handleAddInput} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Investment
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Calculate
        </button>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4 flex items-center">
          <Download className="mr-2" /> Export CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Effective Dollar-Cost Averaging</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Stay consistent with your investment schedule.</li>
          <li>Choose a diversified portfolio to minimize risk.</li>
          <li>Review your strategy periodically to adjust for market changes.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>What is Dollar-Cost Averaging? It's an investment strategy where you invest a fixed amount regularly, regardless of market conditions.</li>
          <li>Why use Dollar-Cost Averaging? It helps reduce the impact of market volatility and avoids the pitfalls of market timing.</li>
          <li>How often should I invest? Common frequencies are monthly or quarterly, but it depends on your financial situation.</li>
        </ul>
      </section>
    </div>
  );
};

export default DollarCostAveragingCalculator;


