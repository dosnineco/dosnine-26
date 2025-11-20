
// /pages/tools/charity-donation-impact-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Education', impact: 0 },
  { name: 'Health', impact: 0 },
  { name: 'Environment', impact: 0 },
];

// Types
interface Category {
  name: string;
  impact: number;
}

interface ChartData {
  name: string;
  impact: number;
}

// Main Component
const CharityDonationImpactCalculator: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalImpact, setTotalImpact] = useState<number>(0);

  // Handlers
  const handleImpactChange = (index: number, value: number) => {
    const newCategories = [...categories];
    newCategories[index].impact = value;
    setCategories(newCategories);
    calculateTotalImpact(newCategories);
  };

  const calculateTotalImpact = (categories: Category[]) => {
    const total = categories.reduce((sum, category) => sum + category.impact, 0);
    setTotalImpact(total);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Impact\n${categories
      .map((c) => `${c.name},${c.impact}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'charity_donation_impact.csv');
  };

  // Chart Data
  const chartData: ChartData[] = categories.map((category) => ({
    name: category.name,
    impact: category.impact,
  }));

  return (
    <>
      <Head>
        <title>Charity Donation Impact Calculator</title>
        <meta name="description" content="Calculate the impact of your charity donations." />
        <meta name="keywords" content="charity, donation, impact, calculator" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/charity-donation-impact-calculator" />
      </Head>
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Charity Donation Impact Calculator</h1>
        <p className="text-base text-gray-700 mb-4">
          Welcome to the Charity Donation Impact Calculator. This tool helps you understand the potential impact of your donations across different categories.
        </p>
        <div>
          {categories.map((category, index) => (
            <div key={index} className="mb-4">
              <label className="block text-xl font-semibold mb-2">{category.name}</label>
              <input
                type="number"
                value={category.impact}
                onChange={(e) => handleImpactChange(index, parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded"
                aria-label={`Impact for ${category.name}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">Total Impact: {totalImpact}</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="impact" fill="#3182ce" />
            </BarChart>
          </ResponsiveContainer>
          <button
            onClick={exportCSV}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            <Download className="inline-block mr-2" /> Export as CSV
          </button>
        </div>
        <Tips />
        <FAQ />
      </div>
    </>
  );
};

// Tips Component
const Tips: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Tips for Maximizing Your Impact</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Research charities to ensure your donations are used effectively.</li>
      <li>Consider recurring donations for sustained impact.</li>
      <li>Look for matching donation programs to double your impact.</li>
    </ul>
  </div>
);

// FAQ Component
const FAQ: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>How is the impact calculated?</strong> The impact is based on the amount you allocate to each category.
      </li>
      <li>
        <strong>Can I add more categories?</strong> Currently, the tool supports predefined categories, but we plan to add more customization options in the future.
      </li>
      <li>
        <strong>Is my data saved?</strong> No, all calculations are done locally in your browser.
      </li>
    </ul>
  </div>
);

export default CharityDonationImpactCalculator;


