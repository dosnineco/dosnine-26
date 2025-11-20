

// /pages/tools/financial-wellness-quiz.tsx

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

const defaultCategories = ['Savings', 'Investments', 'Expenses'];

const FinancialWellnessQuiz: React.FC = () => {
  const [inputs, setInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleInputChange = (index: number, field: string, value: string | number) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setInputs(newInputs);
  };

  const addCategory = () => {
    setInputs([...inputs, { category: '', amount: 0 }]);
  };

  const calculateResults = () => {
    const calculatedResults = inputs.map(input => ({
      category: input.category,
      score: input.amount * 2, // Example calculation
    }));
    setResults(calculatedResults);
    setChartData(calculatedResults.map(result => ({ name: result.category, score: result.score })));
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + results.map(r => `${r.category},${r.score}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'financial_wellness_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Financial Wellness Quiz</title>
        <meta name="description" content="Take the Financial Wellness Quiz to assess your financial health." />
        <meta name="keywords" content="financial wellness, quiz, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/financial-wellness-quiz" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Financial Wellness Quiz</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Financial Wellness Quiz! This tool helps you assess your financial health by evaluating your savings, investments, and expenses. Let's get started!
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Inputs</h2>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base mb-2">
              Category
              <input
                type="text"
                value={input.category}
                onChange={(e) => handleInputChange(index, 'category', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </label>
            <label className="block text-base mb-2">
              Amount
              <input
                type="number"
                value={input.amount}
                onChange={(e) => handleInputChange(index, 'amount', Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </label>
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Category
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Calculate Results
        </button>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="score" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button onClick={exportCSV} className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4">
          <Download className="mr-2" /> Export Results as CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Financial Wellness</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly review your budget and adjust as necessary.</li>
          <li>Set clear financial goals and track your progress.</li>
          <li>Build an emergency fund to cover unexpected expenses.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQ />
      </section>
    </div>
  );
};

const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>What is the Financial Wellness Quiz?</strong>
        <p className="text-base text-gray-700 mb-4">
          The Financial Wellness Quiz is a tool designed to help you evaluate your financial health by analyzing your savings, investments, and expenses.
        </p>
      </li>
      <li>
        <strong>How are the results calculated?</strong>
        <p className="text-base text-gray-700 mb-4">
          The results are calculated based on the inputs you provide, using a simple formula to assess your financial standing.
        </p>
      </li>
      <li>
        <strong>Can I export my results?</strong>
        <p className="text-base text-gray-700 mb-4">
          Yes, you can export your results as a CSV file for further analysis or record-keeping.
        </p>
      </li>
    </ul>
  </div>
);

export default FinancialWellnessQuiz;

