
// /pages/tools/diy-project-cost-estimator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { SoftwareApplication } from 'schema-dts';
import { JsonLd } from 'react-schemaorg';

const defaultCategories = [
  { name: 'Materials', cost: 0 },
  { name: 'Labor', cost: 0 },
  { name: 'Miscellaneous', cost: 0 },
];

type Category = {
  name: string;
  cost: number;
};

const DIYProjectCostEstimator: NextPage = () => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [totalCost, setTotalCost] = useState<number>(0);

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
      .map((cat) => `${cat.name},${cat.cost}`)
      .join('\n')}\nTotal,${totalCost}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'project-cost-estimator.csv');
  };

  const chartData = categories.map((category) => ({
    name: category.name,
    cost: category.cost,
  }));

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>DIY Project Cost Estimator</title>
        <meta name="description" content="Estimate the cost of your DIY projects with our easy-to-use tool." />
        <meta name="keywords" content="DIY, project, cost, estimator, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/diy-project-cost-estimator" />
      </Head>
      <JsonLd<SoftwareApplication>
        item={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'DIY Project Cost Estimator',
          description: 'A tool to estimate the cost of DIY projects.',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'All',
        }}
      />
      <h1 className="text-3xl font-bold text-center mb-6">DIY Project Cost Estimator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the DIY Project Cost Estimator! This tool helps you estimate the total cost of your DIY projects by
        breaking down expenses into categories. Simply enter the costs for each category, and we'll calculate the total
        for you.
      </p>
      <div className="mb-8">
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
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Total Cost: ${totalCost.toFixed(2)}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="#3182ce" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button
        onClick={exportCSV}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <Download className="inline-block mr-2" />
        Export as CSV
      </button>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Accurate Estimation</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Research material costs thoroughly to avoid surprises.</li>
          <li>Consider potential labor costs if you're hiring help.</li>
          <li>Always add a buffer for unexpected expenses.</li>
        </ul>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQ />
      </div>
    </div>
  );
};

const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How accurate is the estimator? - The accuracy depends on the data you provide.</li>
      <li>Can I add more categories? - Currently, the tool supports default categories, but future updates may allow customization.</li>
      <li>Is my data saved? - No, all data is processed locally and not stored.</li>
    </ul>
  </div>
);

export default DIYProjectCostEstimator;


