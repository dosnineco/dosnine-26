

// /pages/tools/moving-cost-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Packing Supplies', cost: 0 },
  { name: 'Transportation', cost: 0 },
  { name: 'Labor', cost: 0 },
];

// Types
interface Category {
  name: string;
  cost: number;
}

interface ChartData {
  name: string;
  cost: number;
}

// Main Component
const MovingCostCalculator: NextPage = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [totalCost, setTotalCost] = useState<number>(0);

  // Handlers
  const handleCostChange = (index: number, cost: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].cost = cost;
    setCategories(updatedCategories);
    calculateTotalCost(updatedCategories);
  };

  const calculateTotalCost = (categories: Category[]) => {
    const total = categories.reduce((sum, category) => sum + category.cost, 0);
    setTotalCost(total);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${categories
      .map((c) => `${c.name},${c.cost}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'moving_costs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart Data
  const chartData: ChartData[] = categories.map((category) => ({
    name: category.name,
    cost: category.cost,
  }));

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Moving Cost Calculator</title>
        <meta name="description" content="Calculate your moving costs easily with our free tool." />
        <meta name="keywords" content="moving, cost, calculator, finance, tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/moving-cost-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Moving Cost Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Planning a move? Use our Moving Cost Calculator to estimate your expenses and budget accordingly.
      </p>

      <div>
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-xl font-semibold mb-2">{category.name}</label>
            <input
              type="number"
              value={category.cost}
              onChange={(e) => handleCostChange(index, parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
              aria-label={`Cost for ${category.name}`}
            />
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Total Cost: ${totalCost}</h2>
        <button
          onClick={exportCSV}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          <Download className="inline-block mr-2" /> Export as CSV
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="cost" fill="#3182ce" />
        </BarChart>
      </ResponsiveContainer>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Reducing Moving Costs</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Plan your move during off-peak seasons to save on costs.</li>
      <li>Get multiple quotes from moving companies to find the best deal.</li>
      <li>Declutter before moving to reduce the volume of items.</li>
    </ul>
  </section>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">How accurate is the Moving Cost Calculator?</h3>
      <p className="text-base text-gray-700 mb-4">
        The calculator provides an estimate based on the inputs you provide. Actual costs may vary.
      </p>
    </div>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">Can I add more categories?</h3>
      <p className="text-base text-gray-700 mb-4">
        Currently, the tool supports a fixed set of categories. Future updates may allow customization.
      </p>
    </div>
  </section>
);

export default MovingCostCalculator;


