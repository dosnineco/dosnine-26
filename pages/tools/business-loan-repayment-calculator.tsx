
// /pages/tools/business-loan-repayment-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { CSVLink } from 'react-csv';
import { NextPage } from 'next';

// Constants
const DEFAULT_LOAN_AMOUNT = 10000;
const DEFAULT_INTEREST_RATE = 5;
const DEFAULT_TERM = 12;

// Types
interface LoanInputs {
  loanAmount: number;
  interestRate: number;
  term: number;
}

interface ChartData {
  name: string;
  Amount: number;
}

// Main Component
const BusinessLoanRepaymentCalculator: NextPage = () => {
  // State
  const [inputs, setInputs] = useState<LoanInputs>({
    loanAmount: DEFAULT_LOAN_AMOUNT,
    interestRate: DEFAULT_INTEREST_RATE,
    term: DEFAULT_TERM,
  });

  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const calculateRepayment = () => {
    const { loanAmount, interestRate, term } = inputs;
    const monthlyRate = interestRate / 100 / 12;
    const payment = loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -term));
    setMonthlyPayment(payment);

    const data = Array.from({ length: term }, (_, i) => ({
      name: `Month ${i + 1}`,
      Amount: payment,
    }));
    setChartData(data);
  };

  // Export CSV
  const exportCSV = () => {
    const csvData = chartData.map((data, index) => ({
      Month: index + 1,
      Payment: data.Amount.toFixed(2),
    }));
    return csvData;
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Business Loan Repayment Calculator</title>
        <meta name="description" content="Calculate your business loan repayments easily with our free tool." />
        <meta name="keywords" content="business loan, repayment calculator, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/business-loan-repayment-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Business Loan Repayment Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Business Loan Repayment Calculator. This tool helps you estimate your monthly loan repayments based on the loan amount, interest rate, and term.
      </p>

      <div className="mb-6">
        <label className="block mb-2 text-xl font-semibold">Loan Amount</label>
        <input
          type="number"
          name="loanAmount"
          value={inputs.loanAmount}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-xl font-semibold">Interest Rate (%)</label>
        <input
          type="number"
          name="interestRate"
          value={inputs.interestRate}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-xl font-semibold">Term (Months)</label>
        <input
          type="number"
          name="term"
          value={inputs.term}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <button
        onClick={calculateRepayment}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
        Calculate
      </button>

      {monthlyPayment > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">Your estimated monthly payment is: <strong>${monthlyPayment.toFixed(2)}</strong></p>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>

          <CSVLink
            data={exportCSV()}
            filename={"loan-repayment-schedule.csv"}
            className="inline-block mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            <Download className="inline-block mr-2" /> Export CSV
          </CSVLink>
        </div>
      )}

      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Managing Your Loan</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Consider making extra payments to reduce the principal faster.</li>
      <li>Review your loan terms regularly to ensure they still meet your needs.</li>
      <li>Keep an eye on interest rates for potential refinancing opportunities.</li>
    </ul>
  </div>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">How is the monthly payment calculated?</h3>
      <p className="text-base text-gray-700">
        The monthly payment is calculated using the loan amount, interest rate, and term. It uses the formula for an amortizing loan.
      </p>
    </div>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">Can I export the repayment schedule?</h3>
      <p className="text-base text-gray-700">
        Yes, you can export the repayment schedule as a CSV file for your records.
      </p>
    </div>
  </div>
);

export default BusinessLoanRepaymentCalculator;
