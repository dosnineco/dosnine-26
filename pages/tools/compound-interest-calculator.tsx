
// /pages/tools/compound-interest-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { CSVLink } from 'react-csv';
import { NextPage } from 'next';

// Constants
const DEFAULT_PRINCIPAL = 1000;
const DEFAULT_RATE = 5;
const DEFAULT_YEARS = 10;

// Types
interface UserInputs {
  principal: number;
  rate: number;
  years: number;
}

interface ChartData {
  year: number;
  amount: number;
}

// Main Component
const CompoundInterestCalculator: NextPage = () => {
  // State
  const [inputs, setInputs] = useState<UserInputs>({
    principal: DEFAULT_PRINCIPAL,
    rate: DEFAULT_RATE,
    years: DEFAULT_YEARS,
  });

  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: parseFloat(value) });
  };

  const calculateCompoundInterest = () => {
    const { principal, rate, years } = inputs;
    const newResults: number[] = [];
    const newChartData: ChartData[] = [];

    for (let year = 1; year <= years; year++) {
      const amount = principal * Math.pow(1 + rate / 100, year);
      newResults.push(amount);
      newChartData.push({ year, amount });
    }

    setResults(newResults);
    setChartData(newChartData);
  };

  const exportCSV = () => {
    const csvData = chartData.map(({ year, amount }) => ({
      Year: year,
      Amount: amount.toFixed(2),
    }));
    return csvData;
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Compound Interest Calculator</title>
        <meta name="description" content="Calculate your compound interest with our free tool." />
        <meta name="keywords" content="compound interest, finance, calculator" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/compound-interest-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Compound Interest Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Compound Interest Calculator! Here, you can calculate how much your investment will grow over time with compound interest.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Enter Your Details</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="principal" className="block text-base font-medium text-gray-700">
              Principal Amount ($)
            </label>
            <input
              type="number"
              id="principal"
              name="principal"
              value={inputs.principal}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="rate" className="block text-base font-medium text-gray-700">
              Annual Interest Rate (%)
            </label>
            <input
              type="number"
              id="rate"
              name="rate"
              value={inputs.rate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="years" className="block text-base font-medium text-gray-700">
              Number of Years
            </label>
            <input
              type="number"
              id="years"
              name="years"
              value={inputs.years}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={calculateCompoundInterest}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Calculate
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <BarChart width={600} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
          <CSVLink
            data={exportCSV()}
            filename="compound-interest-results.csv"
            className="mt-4 inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="inline-block mr-2" />
            Export Results as CSV
          </CSVLink>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Maximizing Compound Interest</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Start investing early to take advantage of compound growth over time.</li>
          <li>Reinvest your earnings to maximize your returns.</li>
          <li>Consider increasing your contributions regularly.</li>
          <li>Be patient and let your investments grow over the long term.</li>
        </ul>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQ />
      </div>
    </div>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">What is compound interest?</h3>
    <p className="text-base text-gray-700 mb-4">
      Compound interest is the interest on a loan or deposit calculated based on both the initial principal and the accumulated interest from previous periods.
    </p>
    <h3 className="text-xl font-semibold mb-4">How often is compound interest calculated?</h3>
    <p className="text-base text-gray-700 mb-4">
      Compound interest can be calculated on different frequencies such as annually, semi-annually, quarterly, monthly, or daily.
    </p>
    <h3 className="text-xl font-semibold mb-4">Why is compound interest beneficial?</h3>
    <p className="text-base text-gray-700 mb-4">
      Compound interest allows your investments to grow at a faster rate compared to simple interest, as it takes into account the accumulated interest over time.
    </p>
  </div>
);

export default CompoundInterestCalculator;
