

// /pages/tools/mortgage-payoff-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface MortgageInputs {
  principal: number;
  interestRate: number;
  monthlyPayment: number;
}

interface ChartData {
  name: string;
  value: number;
}

const MortgagePayoffCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<MortgageInputs>({
    principal: 200000,
    interestRate: 3.5,
    monthlyPayment: 1000,
  });

  const [results, setResults] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const calculatePayoff = () => {
    const { principal, interestRate, monthlyPayment } = inputs;
    const monthlyInterestRate = interestRate / 100 / 12;
    const months = Math.log(monthlyPayment / (monthlyPayment - principal * monthlyInterestRate)) / Math.log(1 + monthlyInterestRate);
    setResults(months);
    setChartData([
      { name: 'Principal', value: principal },
      { name: 'Total Payments', value: monthlyPayment * months },
    ]);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Principal,Interest Rate,Monthly Payment,Months to Payoff\n${inputs.principal},${inputs.interestRate},${inputs.monthlyPayment},${results}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mortgage_payoff.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Mortgage Payoff Calculator</title>
        <meta name="description" content="Calculate how quickly you can pay off your mortgage with our free tool." />
        <meta name="keywords" content="mortgage, payoff, calculator, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/mortgage-payoff-calculator" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Mortgage Payoff Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Mortgage Payoff Calculator. This tool helps you determine how quickly you can pay off your mortgage by adjusting your monthly payments.
      </p>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Enter Your Mortgage Details</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="principal" className="block text-base font-medium text-gray-700">Principal Amount</label>
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
            <label htmlFor="interestRate" className="block text-base font-medium text-gray-700">Annual Interest Rate (%)</label>
            <input
              type="number"
              id="interestRate"
              name="interestRate"
              value={inputs.interestRate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="monthlyPayment" className="block text-base font-medium text-gray-700">Monthly Payment</label>
            <input
              type="number"
              id="monthlyPayment"
              name="monthlyPayment"
              value={inputs.monthlyPayment}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={calculatePayoff}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Calculate
          </button>
        </form>
      </div>
      {results !== null && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">
            You will pay off your mortgage in approximately {Math.round(results)} months.
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
            type="button"
            onClick={exportCSV}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="inline-block mr-2" /> Export as CSV
          </button>
        </div>
      )}
      <Tips />
      <FAQ />
    </div>
  );
};

const Tips: React.FC = () => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Paying Off Your Mortgage Faster</h2>
    <ul className="list-disc list-inside mb-4 text-base text-gray-700">
      <li>Make bi-weekly payments instead of monthly payments.</li>
      <li>Round up your payments to the nearest hundred.</li>
      <li>Make extra payments whenever possible.</li>
      <li>Refinance to a lower interest rate if possible.</li>
    </ul>
  </div>
);

const FAQ: React.FC = () => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">How does the calculator work?</h3>
        <p className="text-base text-gray-700">
          The calculator uses your principal, interest rate, and monthly payment to estimate the number of months required to pay off your mortgage.
        </p>
      </div>
      <div>
        <h3 className="text-xl font-semibold">Can I use this tool for other types of loans?</h3>
        <p className="text-base text-gray-700">
          Yes, you can use this calculator for any amortizing loan, such as car loans or personal loans.
        </p>
      </div>
    </div>
  </div>
);

export default MortgagePayoffCalculator;


