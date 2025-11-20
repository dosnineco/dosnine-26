
// /pages/tools/bi-weekly-mortgage-payment-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_LOAN_AMOUNT = 200000;
const DEFAULT_INTEREST_RATE = 3.5;
const DEFAULT_LOAN_TERM = 30;

// Types
interface UserInputs {
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
}

interface ChartData {
  name: string;
  Monthly: number;
  BiWeekly: number;
}

// Main Component
const BiWeeklyMortgagePaymentCalculator: React.FC = () => {
  // State
  const [inputs, setInputs] = useState<UserInputs>({
    loanAmount: DEFAULT_LOAN_AMOUNT,
    interestRate: DEFAULT_INTEREST_RATE,
    loanTerm: DEFAULT_LOAN_TERM,
  });

  const [results, setResults] = useState<{ monthly: number; biWeekly: number }>({
    monthly: 0,
    biWeekly: 0,
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const calculatePayments = () => {
    const monthlyInterestRate = inputs.interestRate / 100 / 12;
    const numberOfPayments = inputs.loanTerm * 12;
    const monthlyPayment =
      (inputs.loanAmount * monthlyInterestRate) /
      (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));

    const biWeeklyPayment = monthlyPayment / 2;

    setResults({ monthly: monthlyPayment, biWeekly: biWeeklyPayment });
    setChartData([
      { name: 'Payments', Monthly: monthlyPayment, BiWeekly: biWeeklyPayment },
    ]);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Loan Amount,Interest Rate,Loan Term,Monthly Payment,Bi-Weekly Payment\n${inputs.loanAmount},${inputs.interestRate},${inputs.loanTerm},${results.monthly.toFixed(
      2
    )},${results.biWeekly.toFixed(2)}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'mortgage_payments.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Bi-Weekly Mortgage Payment Calculator</title>
        <meta
          name="description"
          content="Calculate your bi-weekly mortgage payments with our free tool."
        />
        <meta
          name="keywords"
          content="mortgage calculator, bi-weekly payments, finance tool"
        />
        <link rel="canonical" href="https://www.expensegoose.com/tools/bi-weekly-mortgage-payment-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">
        Bi-Weekly Mortgage Payment Calculator
      </h1>

      <p className="text-base text-gray-700 mb-4">
        Welcome to the Bi-Weekly Mortgage Payment Calculator. This tool helps you understand how switching to bi-weekly payments can save you money over the life of your loan.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Enter Your Loan Details</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="loanAmount" className="block text-base font-medium text-gray-700">
              Loan Amount
            </label>
            <input
              type="number"
              id="loanAmount"
              name="loanAmount"
              value={inputs.loanAmount}
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
              value={inputs.interestRate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="loanTerm" className="block text-base font-medium text-gray-700">
              Loan Term (Years)
            </label>
            <input
              type="number"
              id="loanTerm"
              name="loanTerm"
              value={inputs.loanTerm}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={calculatePayments}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Calculate
          </button>
        </form>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">
          Monthly Payment: ${results.monthly.toFixed(2)}
        </p>
        <p className="text-base text-gray-700 mb-4">
          Bi-Weekly Payment: ${results.biWeekly.toFixed(2)}
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Monthly" fill="#8884d8" />
            <Bar dataKey="BiWeekly" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>

        <button
          onClick={exportCSV}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
        >
          <Download className="mr-2" />
          Export as CSV
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Your Mortgage</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider making extra payments to reduce your principal faster.</li>
          <li>Review your mortgage terms regularly to ensure they still meet your needs.</li>
          <li>Stay informed about interest rate changes that could affect your payments.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQ />
      </div>
    </div>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xl font-semibold mb-2">What is a bi-weekly mortgage payment?</h3>
      <p className="text-base text-gray-700">
        A bi-weekly mortgage payment plan involves making half of your monthly payment every two weeks. This results in 26 half-payments, or 13 full payments, each year.
      </p>
    </div>
    <div>
      <h3 className="text-xl font-semibold mb-2">How does a bi-weekly payment save money?</h3>
      <p className="text-base text-gray-700">
        By making an extra payment each year, you reduce the principal balance faster, which decreases the amount of interest paid over the life of the loan.
      </p>
    </div>
    <div>
      <h3 className="text-xl font-semibold mb-2">Can I switch to bi-weekly payments anytime?</h3>
      <p className="text-base text-gray-700">
        It depends on your lender. Some lenders offer bi-weekly payment plans, while others may require you to set up a separate account to manage the payments.
      </p>
    </div>
  </div>
);

export default BiWeeklyMortgagePaymentCalculator;
