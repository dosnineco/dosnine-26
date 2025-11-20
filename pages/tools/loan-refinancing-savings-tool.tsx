
// /pages/tools/loan-refinancing-savings-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface LoanInput {
  currentLoanAmount: number;
  currentInterestRate: number;
  newInterestRate: number;
  loanTerm: number;
}

interface ChartData {
  name: string;
  value: number;
}

const LoanRefinancingSavingsTool: React.FC = () => {
  const [loanInput, setLoanInput] = useState<LoanInput>({
    currentLoanAmount: 0,
    currentInterestRate: 0,
    newInterestRate: 0,
    loanTerm: 0,
  });

  const [savings, setSavings] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoanInput({ ...loanInput, [name]: parseFloat(value) });
  };

  const calculateSavings = () => {
    const { currentLoanAmount, currentInterestRate, newInterestRate, loanTerm } = loanInput;
    const currentMonthlyPayment = (currentLoanAmount * currentInterestRate) / (1 - Math.pow(1 + currentInterestRate, -loanTerm));
    const newMonthlyPayment = (currentLoanAmount * newInterestRate) / (1 - Math.pow(1 + newInterestRate, -loanTerm));
    const totalSavings = (currentMonthlyPayment - newMonthlyPayment) * loanTerm;

    setSavings(totalSavings);
    setChartData([
      { name: 'Current Payment', value: currentMonthlyPayment },
      { name: 'New Payment', value: newMonthlyPayment },
    ]);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Current Payment,New Payment\n${chartData.map(d => `${d.value}`).join(',')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'loan_refinancing_savings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Loan Refinancing Savings Tool</title>
        <meta name="description" content="Calculate your potential savings from refinancing your loan." />
        <meta name="keywords" content="loan, refinancing, savings, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/loan-refinancing-savings-tool" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Loan Refinancing Savings Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Loan Refinancing Savings Tool. This tool helps you calculate potential savings when refinancing your loan. Simply input your current loan details and see how much you could save.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Loan Details</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="currentLoanAmount" className="block text-base font-medium text-gray-700">Current Loan Amount</label>
            <input
              type="number"
              id="currentLoanAmount"
              name="currentLoanAmount"
              value={loanInput.currentLoanAmount}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="currentInterestRate" className="block text-base font-medium text-gray-700">Current Interest Rate (%)</label>
            <input
              type="number"
              id="currentInterestRate"
              name="currentInterestRate"
              value={loanInput.currentInterestRate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="newInterestRate" className="block text-base font-medium text-gray-700">New Interest Rate (%)</label>
            <input
              type="number"
              id="newInterestRate"
              name="newInterestRate"
              value={loanInput.newInterestRate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="loanTerm" className="block text-base font-medium text-gray-700">Loan Term (months)</label>
            <input
              type="number"
              id="loanTerm"
              name="loanTerm"
              value={loanInput.loanTerm}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={calculateSavings}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Calculate Savings
          </button>
        </form>
      </div>

      {savings !== null && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">Your potential savings: ${savings.toFixed(2)}</p>
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
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          >
            <Download className="mr-2" /> Export as CSV
          </button>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Refinancing</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider the total cost of refinancing, including fees.</li>
          <li>Shop around for the best interest rates.</li>
          <li>Ensure your credit score is in good shape before applying.</li>
          <li>Understand the terms and conditions of the new loan.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>What is loan refinancing?</li>
          <li>How can I determine if refinancing is right for me?</li>
          <li>What are the potential costs involved in refinancing?</li>
          <li>How does my credit score affect refinancing?</li>
        </ul>
      </div>
    </div>
  );
};

export default LoanRefinancingSavingsTool;


