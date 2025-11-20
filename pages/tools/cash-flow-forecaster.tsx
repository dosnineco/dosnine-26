
// /pages/tools/cash-flow-forecaster.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { SoftwareApplication } from 'schema-dts';
import { JsonLd } from 'react-schemaorg';
import { v4 as uuidv4 } from 'uuid';

// Constants
const DEFAULT_CATEGORIES = ['Income', 'Expenses', 'Savings'];

// Types
interface UserInput {
  id: string;
  category: string;
  amount: number;
}

// Main Component
const CashFlowForecaster: NextPage = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleAddCategory = () => {
    setUserInputs([...userInputs, { id: uuidv4(), category: '', amount: 0 }]);
  };

  const handleInputChange = (id: string, field: keyof UserInput, value: string | number) => {
    setUserInputs(userInputs.map(input => input.id === id ? { ...input, [field]: value } : input));
  };

  const calculateResults = () => {
    const totalIncome = userInputs.filter(input => input.category === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = userInputs.filter(input => input.category === 'Expenses').reduce((acc, curr) => acc + curr.amount, 0);
    const totalSavings = totalIncome - totalExpenses;
    setResults([totalIncome, totalExpenses, totalSavings]);
    setChartData([
      { name: 'Income', value: totalIncome },
      { name: 'Expenses', value: totalExpenses },
      { name: 'Savings', value: totalSavings }
    ]);
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + userInputs.map(input => `${input.category},${input.amount}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, "cash_flow_forecast.csv");
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Cash Flow Forecaster</title>
        <meta name="description" content="A free personal finance tool to forecast your cash flow." />
        <meta name="keywords" content="cash flow, finance, personal finance, forecasting" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/cash-flow-forecaster" />
      </Head>
      <JsonLd<SoftwareApplication>
        item={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Cash Flow Forecaster",
          description: "A free personal finance tool to forecast your cash flow.",
          applicationCategory: "FinanceApplication",
          operatingSystem: "All",
          url: "https://www.expensegoose.com/tools/cash-flow-forecaster"
        }}
      />
      <h1 className="text-3xl font-bold text-center mb-6">Cash Flow Forecaster</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Cash Flow Forecaster! This tool helps you project your financial future by analyzing your income, expenses, and savings. Let's get started!
      </p>
      <section>
        <h2 className="text-2xl font-semibold mb-4">Enter Your Financial Data</h2>
        {userInputs.map(input => (
          <div key={input.id} className="mb-4">
            <label className="block text-base text-gray-700 mb-2">
              Category
              <select
                className="block w-full mt-1"
                value={input.category}
                onChange={(e) => handleInputChange(input.id, 'category', e.target.value)}
              >
                {DEFAULT_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="block text-base text-gray-700 mb-2">
              Amount
              <input
                type="number"
                className="block w-full mt-1"
                value={input.amount}
                onChange={(e) => handleInputChange(input.id, 'amount', parseFloat(e.target.value))}
              />
            </label>
          </div>
        ))}
        <button onClick={handleAddCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Category
        </button>
        <button onClick={calculateResults} className="ml-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Calculate
        </button>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button onClick={exportCSV} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center">
          <Download className="mr-2" /> Export CSV
        </button>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Better Cash Flow Management</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Track your expenses regularly to identify areas for savings.</li>
          <li>Set realistic financial goals and review them periodically.</li>
          <li>Consider automating your savings to ensure consistency.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How accurate is the Cash Flow Forecaster?</li>
          <li>Can I add more categories?</li>
          <li>Is my data secure?</li>
        </ul>
      </section>
    </div>
  );
};

export default CashFlowForecaster;
