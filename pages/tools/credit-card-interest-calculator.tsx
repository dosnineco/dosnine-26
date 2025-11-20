
// /pages/tools/credit-card-interest-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { CSVLink } from 'react-csv';

interface UserInput {
  balance: number;
  interestRate: number;
  monthlyPayment: number;
}

interface ChartData {
  name: string;
  value: number;
}

const CreditCardInterestCalculator: React.FC = () => {
  const [userInput, setUserInput] = useState<UserInput>({
    balance: 0,
    interestRate: 0,
    monthlyPayment: 0,
  });

  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInput({ ...userInput, [name]: parseFloat(value) });
  };

  const calculateInterest = () => {
    const { balance, interestRate, monthlyPayment } = userInput;
    const monthlyRate = interestRate / 100 / 12;
    const months = Math.ceil(balance / monthlyPayment);
    const totalInterest = months * monthlyPayment - balance;
    setResults(totalInterest);

    setChartData([
      { name: 'Balance', value: balance },
      { name: 'Total Interest', value: totalInterest },
    ]);
  };

  const exportCSV = () => {
    const csvData = [
      ['Balance', 'Interest Rate', 'Monthly Payment', 'Total Interest'],
      [userInput.balance, userInput.interestRate, userInput.monthlyPayment, results],
    ];
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'credit-card-interest-calculation.csv');
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Credit Card Interest Calculator</title>
        <meta name="description" content="Calculate your credit card interest with our free tool." />
        <meta name="keywords" content="credit card, interest calculator, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/credit-card-interest-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Credit Card Interest Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Credit Card Interest Calculator. This tool helps you understand how much interest you will pay on your credit card balance over time. Simply enter your balance, interest rate, and monthly payment to get started.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Enter Your Details</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="balance" className="block text-base font-medium text-gray-700">
              Balance
            </label>
            <input
              type="number"
              id="balance"
              name="balance"
              value={userInput.balance}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="interestRate" className="block text-base font-medium text-gray-700">
              Interest Rate (%)
            </label>
            <input
              type="number"
              id="interestRate"
              name="interestRate"
              value={userInput.interestRate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="monthlyPayment" className="block text-base font-medium text-gray-700">
              Monthly Payment
            </label>
            <input
              type="number"
              id="monthlyPayment"
              name="monthlyPayment"
              value={userInput.monthlyPayment}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={calculateInterest}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Calculate
          </button>
        </form>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">
          Based on your inputs, the total interest you will pay is: <strong>${results.toFixed(2)}</strong>
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button
          onClick={exportCSV}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Download className="inline-block mr-2" /> Export as CSV
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Credit Card Debt</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Pay more than the minimum payment to reduce interest.</li>
          <li>Consider transferring your balance to a card with a lower interest rate.</li>
          <li>Set up automatic payments to avoid late fees.</li>
          <li>Create a budget to manage your expenses effectively.</li>
        </ul>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>
            <strong>How is credit card interest calculated?</strong>
            <p className="text-base text-gray-700 mb-4">
              Credit card interest is typically calculated using the average daily balance method. The interest rate is divided by 365 to get a daily rate, which is then applied to the balance each day.
            </p>
          </li>
          <li>
            <strong>What is a good interest rate for a credit card?</strong>
            <p className="text-base text-gray-700 mb-4">
              A good interest rate for a credit card is generally considered to be below the national average, which is around 15-20%. However, rates can vary based on creditworthiness and market conditions.
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CreditCardInterestCalculator;


