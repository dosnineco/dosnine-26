
// /pages/tools/financial-stress-risk-test.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = ['Income', 'Expenses', 'Savings', 'Debt'];

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
const FinancialStressRiskTest: NextPage = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleInputChange = (index: number, field: string, value: string) => {
    const updatedInputs = [...userInputs];
    updatedInputs[index] = { ...updatedInputs[index], [field]: value };
    setUserInputs(updatedInputs);
  };

  const addCategory = () => {
    setUserInputs([...userInputs, { category: '', amount: 0 }]);
  };

  const removeCategory = (index: number) => {
    const updatedInputs = userInputs.filter((_, i) => i !== index);
    setUserInputs(updatedInputs);
  };

  const calculateResults = () => {
    const total = userInputs.reduce((acc, input) => acc + input.amount, 0);
    setResults(total);
    prepareChartData();
  };

  const prepareChartData = () => {
    const data = userInputs.map(input => ({
      name: input.category,
      value: input.amount,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + userInputs.map(input => `${input.category},${input.amount}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'financial-stress-risk-test.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Financial Stress Risk Test</title>
        <meta name="description" content="Assess your financial stress risk with our free tool." />
        <meta name="keywords" content="financial stress, risk test, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/financial-stress-risk-test" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Financial Stress Risk Test</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Financial Stress Risk Test. This tool helps you assess your financial situation by analyzing your income, expenses, savings, and debt. Let's get started!
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Financial Details</h2>
        {userInputs.map((input, index) => (
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
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">Add Category</button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">Calculate</button>
        <p className="text-base text-gray-700 mb-4">Total: ${results}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Track your expenses regularly to identify areas for savings.</li>
          <li>Set financial goals and create a budget to achieve them.</li>
          <li>Consider consulting a financial advisor for personalized advice.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Export Results</h2>
        <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center">
          <Download className="mr-2" /> Export as CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <FAQ />
      </section>
    </div>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How does this tool calculate financial stress risk?</li>
      <li>Can I trust the results from this tool?</li>
      <li>How often should I use this tool?</li>
    </ul>
  </div>
);

export default FinancialStressRiskTest;


