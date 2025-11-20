
// /pages/tools/high-yield-savings-account-interest-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { saveAs } from 'file-saver';
import { CSVLink } from 'react-csv';

// Constants
const DEFAULT_CATEGORIES = ['Savings Account', 'Investment Account'];

// Types
interface UserInput {
  category: string;
  principal: number;
  interestRate: number;
  years: number;
}

interface ChartData {
  name: string;
  value: number;
}

// Main Component
const HighYieldSavingsAccountInterestTracker: React.FC = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleAddCategory = () => {
    setUserInputs([...userInputs, { category: '', principal: 0, interestRate: 0, years: 0 }]);
  };

  const handleInputChange = (index: number, field: keyof UserInput, value: string | number) => {
    const updatedInputs = [...userInputs];
    updatedInputs[index] = { ...updatedInputs[index], [field]: value };
    setUserInputs(updatedInputs);
  };

  const calculateResults = () => {
    const results = userInputs.map(input => {
      const { principal, interestRate, years } = input;
      const finalAmount = principal * Math.pow(1 + interestRate / 100, years);
      return { name: input.category, value: finalAmount };
    });
    setChartData(results);
  };

  const exportCSV = () => {
    const csvData = chartData.map(data => ({
      Category: data.name,
      FinalAmount: data.value.toFixed(2),
    }));
    const csvContent = 'data:text/csv;charset=utf-8,'
      + 'Category,FinalAmount\n'
      + csvData.map(e => `${e.Category},${e.FinalAmount}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'high_yield_savings_account_interest_tracker.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>High-Yield Savings Account Interest Tracker</title>
        <meta name="description" content="Track your high-yield savings account interest over time." />
        <meta name="keywords" content="savings, interest, finance, tracker" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/high-yield-savings-account-interest-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">High-Yield Savings Account Interest Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to your personal finance tool for tracking the growth of your high-yield savings accounts. Enter your details below to see how your savings can grow over time.
      </p>

      <div className="mb-4">
        {userInputs.map((input, index) => (
          <div key={index} className="mb-4">
            <input
              type="text"
              placeholder="Category"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              placeholder="Principal"
              value={input.principal}
              onChange={(e) => handleInputChange(index, 'principal', Number(e.target.value))}
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              placeholder="Interest Rate (%)"
              value={input.interestRate}
              onChange={(e) => handleInputChange(index, 'interestRate', Number(e.target.value))}
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              placeholder="Years"
              value={input.years}
              onChange={(e) => handleInputChange(index, 'years', Number(e.target.value))}
              className="border p-2 mb-2 w-full"
            />
          </div>
        ))}
        <button onClick={handleAddCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">
          Add Category
        </button>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">
          Calculate
        </button>
        <CSVLink data={chartData} filename="interest-tracker.csv" className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">
          Export CSV
        </CSVLink>
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

      <h2 className="text-2xl font-semibold mb-4">Tips</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Regularly review your interest rates to ensure you're getting the best deal.</li>
        <li>Consider diversifying your savings across different accounts for better returns.</li>
        <li>Reinvest your interest to maximize compound growth.</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">What is a high-yield savings account?</h3>
        <p className="text-base text-gray-700 mb-4">
          A high-yield savings account is a type of savings account that typically offers a higher interest rate than a traditional savings account.
        </p>
        <h3 className="text-xl font-semibold mb-2">How often should I check my savings account?</h3>
        <p className="text-base text-gray-700 mb-4">
          It's a good idea to review your savings account at least once a month to track your progress and make any necessary adjustments.
        </p>
      </div>
    </div>
  );
};

export default HighYieldSavingsAccountInterestTracker;


