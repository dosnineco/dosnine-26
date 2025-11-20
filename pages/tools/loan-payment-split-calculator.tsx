

// /pages/tools/loan-payment-split-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface LoanInput {
  principal: number;
  interestRate: number;
  term: number;
}

interface ChartData {
  name: string;
  value: number;
}

const LoanPaymentSplitCalculator: React.FC = () => {
  const [loanInput, setLoanInput] = useState<LoanInput>({ principal: 0, interestRate: 0, term: 0 });
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const calculateLoanPayment = () => {
    const { principal, interestRate, term } = loanInput;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = term * 12;
    const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
    setMonthlyPayment(payment);
    setChartData([
      { name: 'Principal', value: principal },
      { name: 'Interest', value: payment * numberOfPayments - principal },
    ]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoanInput({ ...loanInput, [name]: parseFloat(value) });
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Principal,Interest Rate,Term,Monthly Payment\n${loanInput.principal},${loanInput.interestRate},${loanInput.term},${monthlyPayment}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'loan_payment_split.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Loan Payment Split Calculator</title>
        <meta name="description" content="Calculate your loan payment split with our free tool." />
        <meta name="keywords" content="loan, payment, calculator, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/loan-payment-split-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Loan Payment Split Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Loan Payment Split Calculator. This tool helps you understand how your loan payments are divided between principal and interest. Simply enter your loan details below to get started.
      </p>

      <div className="mb-6">
        <label className="block text-base font-semibold mb-2" htmlFor="principal">Principal Amount</label>
        <input
          type="number"
          id="principal"
          name="principal"
          value={loanInput.principal}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />

        <label className="block text-base font-semibold mb-2" htmlFor="interestRate">Annual Interest Rate (%)</label>
        <input
          type="number"
          id="interestRate"
          name="interestRate"
          value={loanInput.interestRate}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />

        <label className="block text-base font-semibold mb-2" htmlFor="term">Loan Term (Years)</label>
        <input
          type="number"
          id="term"
          name="term"
          value={loanInput.term}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />

        <button
          onClick={calculateLoanPayment}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          Calculate
        </button>
      </div>

      {monthlyPayment > 0 && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">Your estimated monthly payment is <strong>${monthlyPayment.toFixed(2)}</strong>.</p>

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
      )}

      <TipsSection />
      <FAQSection />
    </div>
  );
};

const TipsSection: React.FC = () => (
  <div className="mb-6">
    <h2 className="text-2xl font-semibold mb-4">Tips for Managing Your Loan</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Consider making extra payments to reduce the principal faster.</li>
      <li>Refinance your loan if you find a lower interest rate.</li>
      <li>Keep track of your loan balance and payment schedule.</li>
    </ul>
  </div>
);

const FAQSection: React.FC = () => (
  <div className="mb-6">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li><strong>How is the monthly payment calculated?</strong> The monthly payment is calculated using the loan principal, interest rate, and term.</li>
      <li><strong>Can I use this calculator for any type of loan?</strong> Yes, this calculator can be used for any standard loan with fixed interest rates.</li>
      <li><strong>What if I want to make extra payments?</strong> Extra payments can reduce the principal faster, potentially saving on interest.</li>
    </ul>
  </div>
);

export default LoanPaymentSplitCalculator;


