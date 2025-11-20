

// /pages/tools/consolidation-loan-savings-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

// Constants
const DEFAULT_CATEGORIES = ['Credit Card', 'Personal Loan', 'Student Loan'];

// Types
interface LoanInput {
  category: string;
  amount: number;
  interestRate: number;
}

interface ChartData {
  name: string;
  value: number;
}

// Main Component
const ConsolidationLoanSavingsTool: React.FC = () => {
  // State
  const [loans, setLoans] = useState<LoanInput[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totalSavings, setTotalSavings] = useState<number>(0);

  // Handlers
  const addLoan = () => {
    setLoans([...loans, { category: '', amount: 0, interestRate: 0 }]);
  };

  const updateLoan = (index: number, field: keyof LoanInput, value: string | number) => {
    const updatedLoans = loans.map((loan, i) => (i === index ? { ...loan, [field]: value } : loan));
    setLoans(updatedLoans);
  };

  const calculateSavings = () => {
    // Example calculation logic
    const savings = loans.reduce((acc, loan) => acc + loan.amount * (loan.interestRate / 100), 0);
    setTotalSavings(savings);

    // Prepare chart data
    const data = loans.map((loan) => ({
      name: loan.category,
      value: loan.amount,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    // Example CSV export logic
    const csvContent = 'data:text/csv;charset=utf-8,' + loans.map((loan) => `${loan.category},${loan.amount},${loan.interestRate}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'loan_savings.csv');
    document.body.appendChild(link);
    link.click();
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Consolidation Loan Savings Tool</title>
        <meta name="description" content="Calculate your potential savings with our Consolidation Loan Savings Tool." />
        <meta name="keywords" content="consolidation loan, savings, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/consolidation-loan-savings-tool" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Consolidation Loan Savings Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Discover how much you can save by consolidating your loans. Enter your loan details below to get started.
      </p>

      <div className="mb-6">
        {loans.map((loan, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base font-semibold mb-2">Loan Category</label>
            <select
              className="w-full p-2 border border-gray-300 rounded mb-2"
              value={loan.category}
              onChange={(e) => updateLoan(index, 'category', e.target.value)}
            >
              <option value="">Select Category</option>
              {DEFAULT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <label className="block text-base font-semibold mb-2">Loan Amount</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded mb-2"
              value={loan.amount}
              onChange={(e) => updateLoan(index, 'amount', parseFloat(e.target.value))}
            />

            <label className="block text-base font-semibold mb-2">Interest Rate (%)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded"
              value={loan.interestRate}
              onChange={(e) => updateLoan(index, 'interestRate', parseFloat(e.target.value))}
            />
          </div>
        ))}
        <button onClick={addLoan} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Loan
        </button>
      </div>

      <button onClick={calculateSavings} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6">
        Calculate Savings
      </button>

      <h2 className="text-2xl font-semibold mb-4">Results</h2>
      <p className="text-base text-gray-700 mb-4">Total Potential Savings: ${totalSavings.toFixed(2)}</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-6 flex items-center">
        <Download className="mr-2" /> Export as CSV
      </button>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

// Tips Component
const TipsSection: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Tips for Maximizing Savings</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Consider consolidating high-interest loans first.</li>
      <li>Shop around for the best consolidation loan rates.</li>
      <li>Maintain a good credit score to qualify for better rates.</li>
    </ul>
  </div>
);

// FAQ Component
const FAQSection: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>What is a consolidation loan?</li>
      <li>How does consolidating loans save money?</li>
      <li>What types of loans can be consolidated?</li>
    </ul>
  </div>
);

export default ConsolidationLoanSavingsTool;


