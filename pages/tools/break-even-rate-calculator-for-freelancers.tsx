
// /pages/tools/break-even-rate-calculator-for-freelancers.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface UserInput {
  category: string;
  amount: number;
}

interface ChartData {
  name: string;
  value: number;
}

const defaultCategories: UserInput[] = [
  { category: 'Rent', amount: 0 },
  { category: 'Utilities', amount: 0 },
  { category: 'Software', amount: 0 },
];

const BreakEvenRateCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<UserInput[]>(defaultCategories);
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (index: number, field: 'amount' | 'category', value: string) => {
    const newInputs = [...inputs];
    if (field === 'amount') {
      newInputs[index].amount = parseFloat(value);
    } else {
      newInputs[index].category = value;
    }
    setInputs(newInputs);
  };

  const calculateBreakEvenRate = () => {
    const totalExpenses = inputs.reduce((acc, curr) => acc + curr.amount, 0);
    const breakEvenRate = totalExpenses / 160; // Assuming 160 working hours per month
    setResults(breakEvenRate);
    setChartData(inputs.map(input => ({ name: input.category, value: input.amount })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${inputs.map(input => `${input.category},${input.amount}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'break_even_rate.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Break-even Rate Calculator for Freelancers</title>
        <meta name="description" content="Calculate your break-even rate as a freelancer to ensure you're covering all your expenses." />
        <meta name="keywords" content="freelancer, break-even, rate calculator, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/break-even-rate-calculator-for-freelancers" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Break-even Rate Calculator for Freelancers</h1>
      <p className="text-base text-gray-700 mb-4">
        As a freelancer, understanding your break-even rate is crucial to ensure you're covering all your expenses. This tool helps you calculate the minimum hourly rate you need to charge to break even.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Enter Your Expenses</h2>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base text-gray-700 mb-2">
              {input.category}
              <input
                type="number"
                value={input.amount}
                onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </label>
          </div>
        ))}
        <button onClick={calculateBreakEvenRate} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Calculate
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Your break-even rate is: <strong>${results.toFixed(2)}</strong> per hour.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button onClick={exportCSV} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center">
          <Download className="mr-2" /> Export as CSV
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Freelancers</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly review and update your expenses to ensure accuracy.</li>
          <li>Consider additional costs like taxes and savings when setting your rates.</li>
          <li>Use this tool to experiment with different scenarios and plan for future expenses.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">What is a break-even rate?</h3>
          <p className="text-base text-gray-700">A break-even rate is the minimum hourly rate you need to charge to cover all your expenses.</p>
        </div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">How often should I update my expenses?</h3>
          <p className="text-base text-gray-700">It's a good practice to review your expenses monthly or whenever you have significant changes in your costs.</p>
        </div>
      </section>
    </div>
  );
};

export default BreakEvenRateCalculator;
