
// /pages/tools/emergency-fund-goal-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const defaultCategories = [
  { name: 'Rent', amount: 0 },
  { name: 'Utilities', amount: 0 },
  { name: 'Groceries', amount: 0 },
  { name: 'Transportation', amount: 0 },
];

type Category = {
  name: string;
  amount: number;
};

type ChartData = {
  name: string;
  amount: number;
};

const EmergencyFundGoalTracker: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [goal, setGoal] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleCategoryChange = (index: number, amount: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].amount = amount;
    setCategories(updatedCategories);
    updateChartData(updatedCategories);
  };

  const updateChartData = (categories: Category[]) => {
    const data = categories.map((category) => ({
      name: category.name,
      amount: category.amount,
    }));
    setChartData(data);
  };

  const calculateTotal = () => {
    return categories.reduce((total, category) => total + category.amount, 0);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${categories
      .map((c) => `${c.name},${c.amount}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'emergency_fund_goal.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Emergency Fund Goal Tracker</title>
        <meta name="description" content="Track your emergency fund goals with ease." />
        <meta name="keywords" content="emergency fund, finance, savings, tracker" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/emergency-fund-goal-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Emergency Fund Goal Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Emergency Fund Goal Tracker. This tool helps you plan and track your emergency savings by categorizing your essential expenses.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Expenses</h2>
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base text-gray-700 mb-2">{category.name}</label>
            <input
              type="number"
              value={category.amount}
              onChange={(e) => handleCategoryChange(index, parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Total Monthly Expenses: ${calculateTotal()}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button
          onClick={exportCSV}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mt-4"
        >
          <Download className="inline-block mr-2" /> Export as CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Building Your Emergency Fund</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Start small and gradually increase your savings.</li>
          <li>Automate your savings to ensure consistency.</li>
          <li>Review and adjust your budget regularly.</li>
          <li>Consider high-yield savings accounts for better returns.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>What is an emergency fund? An emergency fund is a savings account for unexpected expenses.</li>
          <li>How much should I save? Aim for 3-6 months of living expenses.</li>
          <li>Where should I keep my emergency fund? In a liquid, easily accessible account.</li>
        </ul>
      </section>
    </div>
  );
};

export default EmergencyFundGoalTracker;


