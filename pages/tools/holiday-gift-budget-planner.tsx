

// /pages/tools/holiday-gift-budget-planner.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Family', budget: 100 },
  { name: 'Friends', budget: 50 },
  { name: 'Colleagues', budget: 30 },
];

// Types
interface Category {
  name: string;
  budget: number;
}

interface ChartData {
  name: string;
  Budget: number;
}

// Main Component
const HolidayGiftBudgetPlanner: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalBudget, setTotalBudget] = useState<number>(180);

  // Handlers
  const handleBudgetChange = (index: number, value: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].budget = value;
    setCategories(updatedCategories);
    calculateTotalBudget(updatedCategories);
  };

  const calculateTotalBudget = (categories: Category[]) => {
    const total = categories.reduce((acc, category) => acc + category.budget, 0);
    setTotalBudget(total);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Budget\n${categories
      .map((cat) => `${cat.name},${cat.budget}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'holiday_gift_budget.csv');
  };

  // Chart Data
  const chartData: ChartData[] = categories.map((category) => ({
    name: category.name,
    Budget: category.budget,
  }));

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Holiday Gift Budget Planner</title>
        <meta name="description" content="Plan your holiday gift budget effectively with our easy-to-use tool." />
        <meta name="keywords" content="holiday, gift, budget, planner, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/holiday-gift-budget-planner" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Holiday Gift Budget Planner</h1>
      <p className="text-base text-gray-700 mb-4">
        Planning your holiday gift budget can be a daunting task, but with our Holiday Gift Budget Planner, you can easily organize your expenses and ensure you stay within your budget.
      </p>

      <div className="mb-8">
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-xl font-semibold mb-2">{category.name}</label>
            <input
              type="number"
              value={category.budget}
              onChange={(e) => handleBudgetChange(index, parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              aria-label={`Budget for ${category.name}`}
            />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Total Budget: ${totalBudget}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Budget" fill="#3182ce" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button
        onClick={exportCSV}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
        <Download className="inline-block mr-2" /> Export as CSV
      </button>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Staying Within Budget</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Set a realistic budget for each category and stick to it.</li>
      <li>Consider homemade gifts or experiences instead of physical items.</li>
      <li>Track your spending regularly to avoid overspending.</li>
    </ul>
  </section>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>How do I add a new category?</strong> - Currently, you can manage the existing categories. Future updates will allow adding new categories.
      </li>
      <li>
        <strong>Can I export my budget?</strong> - Yes, you can export your budget as a CSV file using the export button.
      </li>
      <li>
        <strong>Is my data saved?</strong> - Your data is not saved on our servers. Please export your budget if you wish to keep a record.
      </li>
    </ul>
  </section>
);

export default HolidayGiftBudgetPlanner;


