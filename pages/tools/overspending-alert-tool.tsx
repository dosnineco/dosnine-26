
// /pages/tools/overspending-alert-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Food', 'Entertainment', 'Utilities', 'Transport'];

// Types
interface UserInput {
  category: string;
  amount: number;
}

interface ChartData {
  name: string;
  value: number;
}

// Main Component
const OverspendingAlertTool: React.FC = () => {
  // State
  const [inputs, setInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleInputChange = (index: number, field: keyof UserInput, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: field === 'amount' ? parseFloat(value) : value };
    setInputs(newInputs);
  };

  const addCategory = () => {
    setInputs([...inputs, { category: '', amount: 0 }]);
  };

  const removeCategory = (index: number) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setInputs(newInputs);
  };

  const calculateResults = () => {
    const total = inputs.reduce((acc, input) => acc + input.amount, 0);
    const newResults = inputs.map(input => (input.amount / total) * 100);
    setResults(newResults);

    const newChartData = inputs.map(input => ({ name: input.category, value: input.amount }));
    setChartData(newChartData);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${inputs.map(input => `${input.category},${input.amount}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'overspending-alert.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Overspending Alert Tool</title>
        <meta name="description" content="A free tool to help you track and manage your spending habits." />
        <meta name="keywords" content="personal finance, spending, budget, alert tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/overspending-alert-tool" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Overspending Alert Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Overspending Alert Tool! This tool helps you track your spending habits and alerts you when you're overspending in certain categories. Let's get started!
      </p>

      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <input
              type="text"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
              placeholder="Category"
              className="border p-2 mr-2"
            />
            <input
              type="number"
              value={input.amount}
              onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
              placeholder="Amount"
              className="border p-2 mr-2"
            />
            <button onClick={() => removeCategory(index)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">Add Category</button>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">Calculate</button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mt-4 flex items-center">
        <Download className="mr-2" /> Export CSV
      </button>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Tips</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Review your spending categories regularly to ensure they align with your financial goals.</li>
        <li>Set a budget for each category and stick to it.</li>
        <li>Use this tool monthly to track changes in your spending habits.</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4 mt-8">FAQs</h2>
      <div>
        <h3 className="text-xl font-semibold mb-2">What is the Overspending Alert Tool?</h3>
        <p className="text-base text-gray-700 mb-4">
          The Overspending Alert Tool is designed to help you monitor your spending habits and alert you when you're overspending in certain categories.
        </p>
        <h3 className="text-xl font-semibold mb-2">How do I use this tool?</h3>
        <p className="text-base text-gray-700 mb-4">
          Simply enter your spending categories and amounts, then click "Calculate" to see your results. You can also export your data as a CSV file.
        </p>
      </div>
    </div>
  );
};

export default OverspendingAlertTool;


