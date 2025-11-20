
// /pages/tools/dividend-income-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { SoftwareApplication } from 'schema-dts';
import { JsonLd } from 'react-schemaorg';

interface DividendInput {
  name: string;
  amount: number;
  yield: number;
}

const defaultCategories: DividendInput[] = [
  { name: 'Stock A', amount: 1000, yield: 3 },
  { name: 'Stock B', amount: 1500, yield: 4 },
];

const DividendIncomeTracker: NextPage = () => {
  const [dividends, setDividends] = useState<DividendInput[]>(defaultCategories);
  const [totalIncome, setTotalIncome] = useState<number>(0);

  const handleInputChange = (index: number, field: keyof DividendInput, value: string) => {
    const updatedDividends = [...dividends];
    const updatedDividend = { ...updatedDividends[index] };
    if (field === 'name') {
      updatedDividend.name = value;
    } else if (field === 'amount') {
      updatedDividend.amount = parseFloat(value);
    } else if (field === 'yield') {
      updatedDividend.yield = parseFloat(value);
    }
    updatedDividends[index] = updatedDividend;
    setDividends(updatedDividends);
  };

  const addCategory = () => {
    setDividends([...dividends, { name: '', amount: 0, yield: 0 }]);
  };

  const removeCategory = (index: number) => {
    setDividends(dividends.filter((_, i) => i !== index));
  };

  const calculateIncome = () => {
    const income = dividends.reduce((acc, curr) => acc + (curr.amount * curr.yield) / 100, 0);
    setTotalIncome(income);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + dividends.map(d => `${d.name},${d.amount},${d.yield}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'dividend-income.csv');
  };

  const chartData = dividends.map(d => ({
    name: d.name,
    Income: (d.amount * d.yield) / 100,
  }));

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Dividend Income Tracker</title>
        <meta name="description" content="Track your dividend income with our free tool." />
        <meta name="keywords" content="dividend, income, tracker, finance, investment" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/dividend-income-tracker" />
      </Head>
      <JsonLd<SoftwareApplication>
        item={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Dividend Income Tracker',
          operatingSystem: 'All',
          applicationCategory: 'FinanceApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }}
      />
      <h1 className="text-3xl font-bold text-center mb-6">Dividend Income Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Dividend Income Tracker! This tool helps you calculate your potential dividend income based on your investments. Simply enter your stock details below.
      </p>
      <div>
        {dividends.map((dividend, index) => (
          <div key={index} className="mb-4">
            <input
              type="text"
              value={dividend.name}
              onChange={(e) => handleInputChange(index, 'name', e.target.value)}
              placeholder="Stock Name"
              className="border p-2 mr-2"
            />
            <input
              type="number"
              value={dividend.amount}
              onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
              placeholder="Investment Amount"
              className="border p-2 mr-2"
            />
            <input
              type="number"
              value={dividend.yield}
              onChange={(e) => handleInputChange(index, 'yield', e.target.value)}
              placeholder="Dividend Yield (%)"
              className="border p-2 mr-2"
            />
            <button onClick={() => removeCategory(index)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">Add Stock</button>
        <button onClick={calculateIncome} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">Calculate Income</button>
        <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4 flex items-center">
          <Download className="mr-2" /> Export CSV
        </button>
      </div>
      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <p className="text-base text-gray-700 mb-4">Your total estimated annual dividend income is: <strong>${totalIncome.toFixed(2)}</strong></p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="Income" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
      <h2 className="text-2xl font-semibold mb-4">Tips</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Reinvest your dividends to take advantage of compound growth.</li>
        <li>Diversify your portfolio to reduce risk.</li>
        <li>Keep an eye on the dividend yield and payout ratio of your stocks.</li>
      </ul>
      <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
      <div>
        <h3 className="text-xl font-semibold mb-2">What is a dividend?</h3>
        <p className="text-base text-gray-700 mb-4">A dividend is a distribution of a portion of a company's earnings to its shareholders.</p>
        <h3 className="text-xl font-semibold mb-2">How is dividend yield calculated?</h3>
        <p className="text-base text-gray-700 mb-4">Dividend yield is calculated by dividing the annual dividends paid per share by the price per share.</p>
        <h3 className="text-xl font-semibold mb-2">Why should I track my dividend income?</h3>
        <p className="text-base text-gray-700 mb-4">Tracking your dividend income helps you understand your investment returns and plan for future income.</p>
      </div>
    </div>
  );
};

export default DividendIncomeTracker;


