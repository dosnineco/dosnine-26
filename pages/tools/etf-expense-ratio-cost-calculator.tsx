
// /pages/tools/etf-expense-ratio-cost-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { SoftwareApplication } from 'schema-dts';

const defaultCategories = [
  { name: 'ETF A', expenseRatio: 0.1 },
  { name: 'ETF B', expenseRatio: 0.2 },
];

interface ETF {
  name: string;
  expenseRatio: number;
}

interface ChartData {
  name: string;
  cost: number;
}

const ETFExpenseRatioCostCalculator: NextPage = () => {
  const [etfs, setEtfs] = useState<ETF[]>(defaultCategories);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const calculateCosts = () => {
    const data = etfs.map((etf) => ({
      name: etf.name,
      cost: (etf.expenseRatio / 100) * investmentAmount,
    }));
    setChartData(data);
  };

  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvestmentAmount(Number(e.target.value));
  };

  const handleExportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,ETF Name,Cost\n${chartData
      .map((d) => `${d.name},${d.cost}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'etf-expense-ratio-costs.csv');
  };

  return (
    <>
      <Head>
        <title>ETF Expense Ratio Cost Calculator</title>
        <meta name="description" content="Calculate the cost of ETF expense ratios on your investments." />
        <meta name="keywords" content="ETF, expense ratio, cost calculator, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/etf-expense-ratio-cost-calculator" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'ETF Expense Ratio Cost Calculator',
            description: 'A tool to calculate the cost of ETF expense ratios on your investments.',
            applicationCategory: 'FinanceApplication',
          } as SoftwareApplication)}
        </script>
      </Head>
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-6">ETF Expense Ratio Cost Calculator</h1>
        <p className="text-base text-gray-700 mb-4">
          Welcome to the ETF Expense Ratio Cost Calculator. This tool helps you understand how much you are paying in fees for your ETF investments. Simply input your investment amount and see the costs associated with different ETFs.
        </p>
        <div className="mb-4">
          <label htmlFor="investment" className="block text-base font-semibold mb-2">
            Investment Amount ($)
          </label>
          <input
            type="number"
            id="investment"
            value={investmentAmount}
            onChange={handleInvestmentChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <button
          onClick={calculateCosts}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          Calculate Costs
        </button>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cost" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          <button
            onClick={handleExportCSV}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
          >
            <Download className="mr-2" /> Export as CSV
          </button>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Tips</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>Consider the long-term impact of expense ratios on your investment returns.</li>
            <li>Compare different ETFs to find the best balance between cost and performance.</li>
            <li>Regularly review your investment portfolio to ensure it aligns with your financial goals.</li>
          </ul>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>
              <strong>What is an ETF expense ratio?</strong> The expense ratio is the annual fee that all funds or ETFs charge their shareholders.
            </li>
            <li>
              <strong>How does the expense ratio affect my investment?</strong> A higher expense ratio means more of your investment returns are used to cover fees.
            </li>
            <li>
              <strong>Can I reduce the impact of expense ratios?</strong> Yes, by choosing ETFs with lower expense ratios and regularly reviewing your investments.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default ETFExpenseRatioCostCalculator;


