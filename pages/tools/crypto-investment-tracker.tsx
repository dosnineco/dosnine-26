
// /pages/tools/crypto-investment-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { SoftwareApplication } from 'schema-dts';
import { JsonLd } from 'react-schemaorg';

const defaultCategories = ['Bitcoin', 'Ethereum', 'Ripple'];

interface Investment {
  category: string;
  amount: number;
}

interface ChartData {
  name: string;
  value: number;
}

const CryptoInvestmentTracker: NextPage = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleAddInvestment = () => {
    if (category && amount > 0) {
      const newInvestment = { category, amount };
      setInvestments([...investments, newInvestment]);
      updateChartData([...investments, newInvestment]);
      setCategory('');
      setAmount(0);
    }
  };

  const updateChartData = (investments: Investment[]) => {
    const data = investments.map((inv) => ({
      name: inv.category,
      value: inv.amount,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Amount\n' +
      investments.map((inv) => `${inv.category},${inv.amount}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'crypto-investments.csv');
  };

  return (
    <>
      <Head>
        <title>Crypto Investment Tracker</title>
        <meta name="description" content="Track your cryptocurrency investments easily with our free tool." />
        <meta name="keywords" content="crypto, investment, tracker, finance, tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/crypto-investment-tracker" />
      </Head>
      <JsonLd<SoftwareApplication>
        item={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Crypto Investment Tracker',
          operatingSystem: 'All',
          applicationCategory: 'FinanceApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }}
      />
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Crypto Investment Tracker</h1>
        <p className="text-base text-gray-700 mb-4">
          Welcome to the Crypto Investment Tracker! This tool helps you keep track of your cryptocurrency investments effortlessly. Simply add your investments below and visualize your portfolio.
        </p>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Add Investment</h2>
          <div className="flex flex-col md:flex-row mb-4">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="border p-2 mb-2 md:mb-0 md:mr-2 flex-grow"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Amount"
              className="border p-2 mb-2 md:mb-0 md:mr-2 flex-grow"
            />
            <button
              onClick={handleAddInvestment}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Add
            </button>
          </div>
        </div>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Investment Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <button
          onClick={exportCSV}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-8"
        >
          <Download className="inline-block mr-2" /> Export as CSV
        </button>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Tips for Better Investment</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>Always diversify your portfolio to minimize risks.</li>
            <li>Stay updated with the latest market trends and news.</li>
            <li>Invest only what you can afford to lose.</li>
            <li>Regularly review and adjust your investment strategy.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">What is the Crypto Investment Tracker?</h3>
            <p className="text-base text-gray-700 mb-4">
              The Crypto Investment Tracker is a free tool designed to help you manage and visualize your cryptocurrency investments.
            </p>
          </div>
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">How do I add an investment?</h3>
            <p className="text-base text-gray-700 mb-4">
              Simply enter the category and amount of your investment in the fields provided and click "Add".
            </p>
          </div>
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">Can I export my data?</h3>
            <p className="text-base text-gray-700 mb-4">
              Yes, you can export your investment data as a CSV file by clicking the "Export as CSV" button.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CryptoInvestmentTracker;


