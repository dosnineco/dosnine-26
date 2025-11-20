
// /pages/tools/fire-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = ['Housing', 'Transportation', 'Food', 'Entertainment', 'Savings'];

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
const FireCalculator: NextPage = () => {
  // State
  const [inputs, setInputs] = useState<UserInput[]>(DEFAULT_CATEGORIES.map(category => ({ category, amount: 0 })));
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleInputChange = (index: number, amount: number) => {
    const newInputs = [...inputs];
    newInputs[index].amount = amount;
    setInputs(newInputs);
  };

  const calculateResults = () => {
    const total = inputs.reduce((acc, input) => acc + input.amount, 0);
    setResults(total);
    setChartData(inputs.map(input => ({ name: input.category, value: input.amount })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${inputs.map(input => `${input.category},${input.amount}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'fire-calculator-results.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>FIRE Calculator - Personal Finance Tool</title>
        <meta name="description" content="Calculate your financial independence and early retirement goals with our FIRE Calculator." />
        <meta name="keywords" content="FIRE, financial independence, early retirement, calculator, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/fire-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">FIRE Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the FIRE Calculator, your personal finance tool to help you plan for financial independence and early retirement. Enter your monthly expenses in the categories below to see how much you need to save.
      </p>

      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base font-semibold mb-2">{input.category}</label>
            <input
              type="number"
              value={input.amount}
              onChange={(e) => handleInputChange(index, parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              aria-label={`Amount for ${input.category}`}
            />
          </div>
        ))}
      </div>

      <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6">
        Calculate
      </button>

      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <p className="text-base text-gray-700 mb-4">Total Monthly Expenses: ${results}</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button onClick={exportCSV} className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-6">
        <Download className="mr-2" /> Export as CSV
      </button>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Tips for Achieving FIRE</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Track your expenses regularly to identify areas for savings.</li>
      <li>Invest in low-cost index funds to grow your savings over time.</li>
      <li>Consider side hustles to increase your income.</li>
      <li>Set realistic goals and review them periodically.</li>
    </ul>
  </div>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>What is FIRE?</strong> - FIRE stands for Financial Independence, Retire Early. It's a movement that encourages saving and investing to achieve financial freedom.
      </li>
      <li>
        <strong>How do I calculate my FIRE number?</strong> - Your FIRE number is typically 25 times your annual expenses. This calculator helps you estimate your monthly expenses.
      </li>
      <li>
        <strong>Can I achieve FIRE with a low income?</strong> - Yes, by reducing expenses and increasing savings, anyone can work towards FIRE.
      </li>
    </ul>
  </div>
);

export default FireCalculator;


