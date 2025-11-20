// /pages/tools/budgeting-personality-test.tsx



import React, { useState } from 'react';

import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { Download } from 'lucide-react';

interface UserInput {
  category: string;
  amount: number;
}

interface Result {
  category: string;
  score: number;
}

const defaultCategories = ['Savings', 'Investments', 'Expenses', 'Luxury'];

const BudgetingPersonalityTest: React.FC = () => {
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleInputChange = (index: number, field: string, value: string | number) => {
    const updatedInputs = [...userInputs];
    updatedInputs[index] = { ...updatedInputs[index], [field]: value };
    setUserInputs(updatedInputs);
  };

  const addCategory = () => {
    setUserInputs([...userInputs, { category: '', amount: 0 }]);
  };

  const calculateResults = () => {
    const calculatedResults = userInputs.map(input => ({
      category: input.category,
      score: input.amount * 2, // Example calculation logic
    }));
    setResults(calculatedResults);
    setChartData(calculatedResults.map(result => ({ name: result.category, score: result.score })));
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + results.map(result => `${result.category},${result.score}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'budgeting_personality_test_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Budgeting Personality Test</title>
        <meta name="description" content="Discover your budgeting personality with our free test." />
        <meta name="keywords" content="budgeting, finance, personality test" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/budgeting-personality-test" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Budgeting Personality Test</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Budgeting Personality Test! This tool helps you understand your financial habits and personality. Let's get started by entering your budget categories and amounts.
      </p>
      <div>
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
              onChange={(e) => handleInputChange(index, 'amount', parseFloat(e.target.value))}
              placeholder="Amount"
              className="border p-2"
            />
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Add Category
        </button>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Calculate Results
        </button>
      </div>
      {results.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4 flex items-center">
            <Download className="mr-2" /> Export as CSV
          </button>
          <Tips />
        </div>
      )}
      <FAQ />
    </div>
  );
};

const Tips: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Tips for Better Budgeting</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Track your expenses regularly to identify spending patterns.</li>
      <li>Set realistic financial goals and review them periodically.</li>
      <li>Consider using budgeting apps to automate tracking and analysis.</li>
    </ul>
  </div>
);

const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How does the Budgeting Personality Test work?</li>
      <li>Can I add more categories to the test?</li>
      <li>How is my score calculated?</li>
    </ul>
  </div>
);

export default BudgetingPersonalityTest;
