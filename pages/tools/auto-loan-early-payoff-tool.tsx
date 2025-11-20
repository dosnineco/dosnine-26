
// /pages/tools/auto-loan-early-payoff-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface LoanInput {
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  extraPayment: number;
}

interface ChartData {
  name: string;
  value: number;
}

const AutoLoanEarlyPayoffTool: React.FC = () => {
  const [loanInput, setLoanInput] = useState<LoanInput>({
    loanAmount: 0,
    interestRate: 0,
    loanTerm: 0,
    extraPayment: 0,
  });

  const [results, setResults] = useState<{ totalInterest: number; monthsSaved: number }>({
    totalInterest: 0,
    monthsSaved: 0,
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoanInput((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const calculateEarlyPayoff = () => {
    // Calculation logic for early payoff
    const { loanAmount, interestRate, loanTerm, extraPayment } = loanInput;
    const monthlyRate = interestRate / 100 / 12;
    const n = loanTerm * 12;
    const monthlyPayment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
    const newMonthlyPayment = monthlyPayment + extraPayment;

    let remainingBalance = loanAmount;
    let totalInterest = 0;
    let months = 0;

    while (remainingBalance > 0) {
      const interest = remainingBalance * monthlyRate;
      totalInterest += interest;
      remainingBalance = remainingBalance + interest - newMonthlyPayment;
      months++;
    }

    const monthsSaved = loanTerm * 12 - months;

    setResults({ totalInterest, monthsSaved });
    setChartData([
      { name: 'Original Term', value: loanTerm * 12 },
      { name: 'New Term', value: months },
    ]);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Loan Amount,Interest Rate,Loan Term,Extra Payment,Total Interest,Months Saved\n${loanInput.loanAmount},${loanInput.interestRate},${loanInput.loanTerm},${loanInput.extraPayment},${results.totalInterest},${results.monthsSaved}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'auto_loan_early_payoff.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Auto Loan Early Payoff Tool</title>
        <meta name="description" content="Calculate how much you can save by paying off your auto loan early." />
        <meta name="keywords" content="auto loan, early payoff, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/auto-loan-early-payoff-tool" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Auto Loan Early Payoff Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Discover how much you can save by paying off your auto loan early. Enter your loan details below to get started.
      </p>
      <div className="mb-8">
        <label className="block mb-2 text-xl font-semibold">Loan Amount</label>
        <input
          type="number"
          name="loanAmount"
          value={loanInput.loanAmount}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <label className="block mb-2 text-xl font-semibold">Interest Rate (%)</label>
        <input
          type="number"
          name="interestRate"
          value={loanInput.interestRate}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <label className="block mb-2 text-xl font-semibold">Loan Term (years)</label>
        <input
          type="number"
          name="loanTerm"
          value={loanInput.loanTerm}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <label className="block mb-2 text-xl font-semibold">Extra Monthly Payment</label>
        <input
          type="number"
          name="extraPayment"
          value={loanInput.extraPayment}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          onClick={calculateEarlyPayoff}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          Calculate
        </button>
      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">
          Total Interest Paid: ${results.totalInterest.toFixed(2)}
        </p>
        <p className="text-base text-gray-700 mb-4">
          Months Saved: {results.monthsSaved}
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
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
        >
          <Download className="mr-2" /> Export CSV
        </button>
      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Paying Off Your Loan Early</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Make bi-weekly payments instead of monthly payments.</li>
          <li>Round up your payments to the nearest hundred.</li>
          <li>Use windfalls like tax refunds or bonuses to make extra payments.</li>
          <li>Consider refinancing for a lower interest rate.</li>
        </ul>
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQ />
      </div>
    </div>
  );
};

const FAQ: React.FC = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">FAQs</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How does paying extra affect my loan?</li>
      <li>Can I pay off my loan early without penalties?</li>
      <li>What is the best strategy for early payoff?</li>
    </ul>
  </div>
);

export default AutoLoanEarlyPayoffTool;
