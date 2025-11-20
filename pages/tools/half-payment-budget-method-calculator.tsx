
// /pages/tools/half-payment-budget-method-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { SoftwareApplication } from 'schema-dts';
import { JsonLd } from 'react-schemaorg';

const defaultCategories = [
  { name: 'Rent/Mortgage', amount: 0 },
  { name: 'Utilities', amount: 0 },
  { name: 'Groceries', amount: 0 },
  { name: 'Transportation', amount: 0 },
];

type Category = {
  name: string;
  amount: number;
};

const HalfPaymentBudgetMethodCalculator: NextPage = () => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleCategoryChange = (index: number, field: string, value: string) => {
    const updatedCategories = [...categories];
    updatedCategories[index] = {
      ...updatedCategories[index],
      [field]: field === 'amount' ? parseFloat(value) : value,
    };
    setCategories(updatedCategories);
  };

  const calculateResults = () => {
    const calculatedResults = categories.map(category => category.amount / 2);
    setResults(calculatedResults);
    setChartData(
      categories.map((category, index) => ({
        name: category.name,
        Original: category.amount,
        'Half-Payment': calculatedResults[index],
      }))
    );
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Original,Half-Payment\n${categories
      .map((category, index) => `${category.name},${category.amount},${results[index]}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'half-payment-budget.csv');
  };

  return (
    <>
      <Head>
        <title>Half-Payment Budget Method Calculator</title>
        <meta name="description" content="Calculate your budget using the Half-Payment Method." />
        <meta name="keywords" content="budget, finance, calculator, half-payment" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/half-payment-budget-method-calculator" />
      </Head>
      <JsonLd<SoftwareApplication>
        item={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Half-Payment Budget Method Calculator',
          description: 'A tool to calculate your budget using the Half-Payment Method.',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'All',
        }}
      />
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Half-Payment Budget Method Calculator</h1>
        <p className="text-base text-gray-700 mb-4">
          Welcome to the Half-Payment Budget Method Calculator. This tool helps you manage your finances by splitting your expenses into half-payments, making it easier to budget and save.
        </p>
        <div className="mb-8">
          {categories.map((category, index) => (
            <div key={index} className="mb-4">
              <label className="block text-base font-semibold mb-2">{category.name}</label>
              <input
                type="text"
                value={category.amount}
                onChange={(e) => handleCategoryChange(index, 'amount', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                aria-label={`Amount for ${category.name}`}
              />
            </div>
          ))}
          <button
            onClick={calculateResults}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Calculate
          </button>
        </div>
        {results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Results</h2>
            <BarChart width={500} height={300} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Original" fill="#8884d8" />
              <Bar dataKey="Half-Payment" fill="#82ca9d" />
            </BarChart>
            <button
              onClick={exportCSV}
              className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
            >
              <Download className="inline-block mr-2" />
              Export as CSV
            </button>
          </div>
        )}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Tips</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>Review your budget regularly to ensure it aligns with your financial goals.</li>
            <li>Consider setting up automatic transfers to savings accounts to reinforce the half-payment method.</li>
            <li>Use this method to gradually build an emergency fund.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>
              <strong>What is the Half-Payment Budget Method?</strong>
              <p className="text-base text-gray-700 mb-4">
                The Half-Payment Budget Method involves splitting your expenses into two payments, making it easier to manage and save.
              </p>
            </li>
            <li>
              <strong>How often should I use this calculator?</strong>
              <p className="text-base text-gray-700 mb-4">
                It's recommended to use this calculator monthly or whenever your financial situation changes.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default HalfPaymentBudgetMethodCalculator;


