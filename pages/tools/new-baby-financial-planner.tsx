

// /pages/tools/new-baby-financial-planner.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { NextPage } from 'next';

// Constants
const defaultCategories = [
  { name: 'Diapers', cost: 50 },
  { name: 'Formula', cost: 100 },
  { name: 'Clothing', cost: 75 },
];

// Types
interface Category {
  name: string;
  cost: number;
}

interface UserInput {
  categories: Category[];
}

// Main Component
const NewBabyFinancialPlanner: NextPage = () => {
  // State
  const [userInput, setUserInput] = useState<UserInput>({ categories: defaultCategories });
  const [results, setResults] = useState<number>(0);

  // Handlers
  const handleCategoryChange = (index: number, cost: number) => {
    const updatedCategories = [...userInput.categories];
    updatedCategories[index].cost = cost;
    setUserInput({ categories: updatedCategories });
  };

  const calculateResults = () => {
    const totalCost = userInput.categories.reduce((acc, category) => acc + category.cost, 0);
    setResults(totalCost);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${userInput.categories
      .map((cat) => `${cat.name},${cat.cost}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'new_baby_financial_plan.csv');
    document.body.appendChild(link);
    link.click();
  };

  // Chart Data
  const chartData = userInput.categories.map((category) => ({
    name: category.name,
    cost: category.cost,
  }));

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>New Baby Financial Planner</title>
        <meta name="description" content="Plan your finances for a new baby with our free tool." />
        <meta name="keywords" content="baby, finance, planner, budget" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/new-baby-financial-planner" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">New Baby Financial Planner</h1>
      <p className="text-base text-gray-700 mb-4">
        Planning for a new baby can be overwhelming. Use this tool to estimate your monthly expenses and plan accordingly.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Monthly Expenses</h2>
        {userInput.categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base text-gray-700 mb-2">
              {category.name}
              <input
                type="number"
                value={category.cost}
                onChange={(e) => handleCategoryChange(index, parseInt(e.target.value))}
                className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
              />
            </label>
          </div>
        ))}
        <button
          onClick={calculateResults}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          Calculate Total
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Total Monthly Cost: ${results}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button
          onClick={exportCSV}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
        >
          <Download className="mr-2" /> Export as CSV
        </button>
      </section>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for New Parents</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Consider buying in bulk to save on essentials like diapers and wipes.</li>
      <li>Look for second-hand clothing and toys to cut costs.</li>
      <li>Plan meals and prepare in advance to save time and money.</li>
    </ul>
  </section>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">How accurate is this tool?</h3>
      <p className="text-base text-gray-700">
        This tool provides an estimate based on average costs. Your actual expenses may vary.
      </p>
    </div>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">Can I add more categories?</h3>
      <p className="text-base text-gray-700">
        Currently, the tool supports a fixed set of categories. We plan to add customization options in the future.
      </p>
    </div>
  </section>
);

export default NewBabyFinancialPlanner;


