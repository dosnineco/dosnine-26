

// /pages/tools/freelance-project-pricing-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Design', rate: 50 },
  { name: 'Development', rate: 70 },
  { name: 'Testing', rate: 40 },
];

// Types
interface Category {
  name: string;
  rate: number;
}

interface UserInput {
  category: string;
  hours: number;
}

// Main Component
const FreelanceProjectPricingCalculator: React.FC = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleAddCategory = () => {
    setUserInputs([...userInputs, { category: '', hours: 0 }]);
  };

  const handleInputChange = (index: number, field: string, value: string | number) => {
    const newInputs = [...userInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setUserInputs(newInputs);
  };

  const calculateResults = () => {
    let total = 0;
    const data = userInputs.map(input => {
      const category = DEFAULT_CATEGORIES.find(cat => cat.name === input.category);
      const cost = category ? category.rate * input.hours : 0;
      total += cost;
      return { name: input.category, cost };
    });
    setResults(total);
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + userInputs.map(input => `${input.category},${input.hours}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'freelance_project_pricing.csv');
    document.body.appendChild(link);
    link.click();
  };

  // UI Rendering
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Freelance Project Pricing Calculator</title>
        <meta name="description" content="Calculate your freelance project pricing with ease." />
        <meta name="keywords" content="freelance, pricing, calculator, project" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/freelance-project-pricing-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Freelance Project Pricing Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Freelance Project Pricing Calculator. This tool helps you estimate the cost of your freelance projects based on different categories and hours worked.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Project Details</h2>
      {userInputs.map((input, index) => (
        <div key={index} className="mb-4">
          <label className="block text-base mb-2">Category</label>
          <select
            className="block w-full p-2 border border-gray-300 rounded mb-2"
            value={input.category}
            onChange={(e) => handleInputChange(index, 'category', e.target.value)}
          >
            <option value="">Select a category</option>
            {DEFAULT_CATEGORIES.map((cat, idx) => (
              <option key={idx} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <label className="block text-base mb-2">Hours</label>
          <input
            type="number"
            className="block w-full p-2 border border-gray-300 rounded"
            value={input.hours}
            onChange={(e) => handleInputChange(index, 'hours', parseInt(e.target.value))}
          />
        </div>
      ))}
      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        onClick={handleAddCategory}
      >
        Add Category
      </button>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Results</h2>
      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4"
        onClick={calculateResults}
      >
        Calculate
      </button>
      <p className="text-base text-gray-700 mb-4">Total Cost: ${results}</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="cost" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4"
        onClick={exportCSV}
      >
        <Download className="inline-block mr-2" /> Export CSV
      </button>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Tips for Accurate Pricing</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Consider all project phases: planning, execution, and review.</li>
        <li>Account for potential revisions and client feedback.</li>
        <li>Include a buffer for unexpected challenges.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Frequently Asked Questions</h2>
      <FAQ />

    </div>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How do I determine the hourly rate for a category?</li>
      <li>Can I add custom categories?</li>
      <li>How accurate is this calculator?</li>
    </ul>
  </div>
);

export default FreelanceProjectPricingCalculator;


