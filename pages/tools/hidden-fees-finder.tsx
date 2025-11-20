
// /pages/tools/hidden-fees-finder.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Banking', 'Investments', 'Loans', 'Credit Cards'];

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
const HiddenFeesFinder: React.FC = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleAddCategory = () => {
    setUserInputs([...userInputs, { category: '', amount: 0 }]);
  };

  const handleInputChange = (index: number, field: keyof UserInput, value: string | number) => {
    const updatedInputs = [...userInputs];
    if (field === 'amount') {
      updatedInputs[index].amount = parseFloat(value as string);
    } else if (field === 'category') {
      updatedInputs[index].category = value as string;
    }
    setUserInputs(updatedInputs);
  };

  const calculateResults = () => {
    const calculatedResults = userInputs.map(input => input.amount * 0.05); // Example calculation
    setResults(calculatedResults);
    prepareChartData(calculatedResults);
  };

  const prepareChartData = (calculatedResults: number[]) => {
    const data = userInputs.map((input, index) => ({
      name: input.category || `Category ${index + 1}`,
      value: calculatedResults[index],
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Amount,Result\n' +
      userInputs.map((input, index) => `${input.category},${input.amount},${results[index]}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'hidden-fees-results.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Hidden Fees Finder</title>
        <meta name="description" content="Discover hidden fees in your personal finances with our free tool." />
        <meta name="keywords" content="finance, hidden fees, personal finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/hidden-fees-finder" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Hidden Fees Finder</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Hidden Fees Finder! This tool helps you uncover hidden fees in your personal finances. Simply enter your categories and amounts, and we'll do the rest.
      </p>

      <div className="mb-6">
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
              className="border p-2"
            />
          </div>
        ))}
        <button onClick={handleAddCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Category
        </button>
      </div>

      <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6">
        Calculate
      </button>

      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button onClick={exportCSV} className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6">
        <Download className="mr-2" /> Export CSV
      </button>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Reducing Hidden Fees</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Review your bank statements regularly to spot any unexpected charges.</li>
      <li>Negotiate fees with your service providers whenever possible.</li>
      <li>Consider switching to providers with lower fees.</li>
    </ul>
  </div>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>How does the Hidden Fees Finder work?</strong>
        <p className="text-base text-gray-700 mb-4">The tool calculates potential hidden fees based on the amounts you enter for each category.</p>
      </li>
      <li>
        <strong>Can I trust the results?</strong>
        <p className="text-base text-gray-700 mb-4">While the tool provides estimates, it's always best to verify with your financial statements.</p>
      </li>
    </ul>
  </div>
);

export default HiddenFeesFinder;


