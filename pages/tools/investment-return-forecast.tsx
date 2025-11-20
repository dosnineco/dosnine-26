
// /pages/tools/investment-return-forecast.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

// Constants
const DEFAULT_CATEGORIES = ['Stocks', 'Bonds', 'Real Estate'];

// Types
interface InvestmentInput {
  category: string;
  amount: number;
  rateOfReturn: number;
}

interface ChartData {
  name: string;
  value: number;
}

// Main Component
const InvestmentReturnForecast: NextPage = () => {
  // State
  const [investments, setInvestments] = useState<InvestmentInput[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totalReturn, setTotalReturn] = useState<number>(0);

  // Handlers
  const handleAddInvestment = () => {
    setInvestments([...investments, { category: '', amount: 0, rateOfReturn: 0 }]);
  };

  const handleInvestmentChange = (index: number, field: keyof InvestmentInput, value: string | number) => {
    const updatedInvestments = investments.map((investment, i) =>
      i === index ? { ...investment, [field]: value } : investment
    );
    setInvestments(updatedInvestments);
  };

  const calculateReturns = () => {
    let total = 0;
    const data: ChartData[] = investments.map((investment) => {
      const returnAmount = (investment.amount * investment.rateOfReturn) / 100;
      total += returnAmount;
      return { name: investment.category, value: returnAmount };
    });
    setChartData(data);
    setTotalReturn(total);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Amount,Rate of Return,Return\n' +
      investments.map(i => `${i.category},${i.amount},${i.rateOfReturn},${(i.amount * i.rateOfReturn) / 100}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'investment-returns.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Investment Return Forecast</title>
        <meta name="description" content="Forecast your investment returns with our free tool." />
        <meta name="keywords" content="investment, return, forecast, finance tool" />
        <link rel="canonical" href="https://yourdomain.com/tools/investment-return-forecast" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Investment Return Forecast</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Investment Return Forecast tool. Here, you can estimate the potential returns on your investments across different categories. Simply input your investment details, and let us do the calculations for you.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Investment Details</h2>
      {investments.map((investment, index) => (
        <div key={index} className="mb-4">
          <label className="block text-base text-gray-700 mb-2">
            Category
            <select
              className="block w-full mt-1"
              value={investment.category}
              onChange={(e) => handleInvestmentChange(index, 'category', e.target.value)}
            >
              <option value="">Select Category</option>
              {DEFAULT_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block text-base text-gray-700 mb-2">
            Amount
            <input
              type="number"
              className="block w-full mt-1"
              value={investment.amount}
              onChange={(e) => handleInvestmentChange(index, 'amount', parseFloat(e.target.value))}
            />
          </label>
          <label className="block text-base text-gray-700 mb-2">
            Rate of Return (%)
            <input
              type="number"
              className="block w-full mt-1"
              value={investment.rateOfReturn}
              onChange={(e) => handleInvestmentChange(index, 'rateOfReturn', parseFloat(e.target.value))}
            />
          </label>
        </div>
      ))}
      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4"
        onClick={handleAddInvestment}
      >
        Add Investment
      </button>
      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4"
        onClick={calculateReturns}
      >
        Calculate Returns
      </button>

      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <p className="text-base text-gray-700 mb-4">Total Estimated Return: ${totalReturn.toFixed(2)}</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4"
        onClick={exportCSV}
      >
        <Download className="inline-block mr-2" /> Export as CSV
      </button>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Tips for Better Investment</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Diversify your portfolio to minimize risks.</li>
        <li>Regularly review your investment strategy.</li>
        <li>Stay informed about market trends.</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Frequently Asked Questions</h2>
      <FAQ />

    </div>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How accurate is the forecast? - The forecast is based on the inputs you provide and should be used as a guideline.</li>
      <li>Can I add more categories? - Yes, you can customize the categories as needed.</li>
      <li>Is my data saved? - No, all data is processed locally and not stored.</li>
    </ul>
  </div>
);

export default InvestmentReturnForecast;


