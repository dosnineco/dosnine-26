
// /pages/tools/credit-utilization-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';
import { SoftwareApplication } from 'schema-dts';
import { JsonLd } from 'react-schemaorg';

const defaultCategories = ['Credit Card 1', 'Credit Card 2', 'Credit Card 3'];

interface CreditUtilizationInput {
  category: string;
  creditLimit: number;
  currentBalance: number;
}

const CreditUtilizationTracker: NextPage = () => {
  const [inputs, setInputs] = useState<CreditUtilizationInput[]>([]);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleInputChange = (index: number, field: keyof CreditUtilizationInput, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: parseFloat(value) || 0 };
    setInputs(newInputs);
  };

  const addCategory = () => {
    setInputs([...inputs, { category: `Credit Card ${inputs.length + 1}`, creditLimit: 0, currentBalance: 0 }]);
  };

  const calculateResults = () => {
    const newResults = inputs.map(input => (input.currentBalance / input.creditLimit) * 100);
    setResults(newResults);

    const newChartData = inputs.map((input, index) => ({
      name: input.category,
      Utilization: newResults[index],
    }));
    setChartData(newChartData);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Credit Limit,Current Balance,Utilization\n` +
      inputs.map((input, index) => `${input.category},${input.creditLimit},${input.currentBalance},${results[index]}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'credit_utilization.csv');
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Credit Utilization Tracker</title>
        <meta name="description" content="Track your credit utilization with our free tool." />
        <meta name="keywords" content="credit, finance, utilization, tracker" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/credit-utilization-tracker" />
      </Head>
      <JsonLd<SoftwareApplication>
        item={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Credit Utilization Tracker',
          operatingSystem: 'All',
          applicationCategory: 'FinanceApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }}
      />
      <h1 className="text-3xl font-bold text-center mb-6">Credit Utilization Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Credit Utilization Tracker! This tool helps you monitor your credit card usage and manage your finances effectively. Simply input your credit card details, and we'll calculate your utilization rate.
      </p>
      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{input.category}</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-gray-700 mb-1">Credit Limit</label>
                <input
                  type="number"
                  value={input.creditLimit}
                  onChange={(e) => handleInputChange(index, 'creditLimit', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-gray-700 mb-1">Current Balance</label>
                <input
                  type="number"
                  value={input.currentBalance}
                  onChange={(e) => handleInputChange(index, 'currentBalance', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Add Credit Card
        </button>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Calculate Utilization
        </button>
      </div>
      {results.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Utilization" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4">
            <Download className="inline-block mr-2" /> Export as CSV
          </button>
          <Tips />
        </div>
      )}
      <FAQ />
    </div>
  );
};

const Tips: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Tips for Managing Credit Utilization</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Keep your credit utilization below 30% for a healthy credit score.</li>
      <li>Pay off your balances in full each month to avoid interest charges.</li>
      <li>Consider requesting a credit limit increase to lower your utilization rate.</li>
    </ul>
  </div>
);

const FAQ: React.FC = () => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>What is credit utilization?</strong>
        <p className="text-base text-gray-700 mb-4">Credit utilization is the ratio of your credit card balances to your credit limits. It's a key factor in your credit score.</p>
      </li>
      <li>
        <strong>Why is credit utilization important?</strong>
        <p className="text-base text-gray-700 mb-4">Maintaining a low credit utilization rate can help improve your credit score and demonstrate responsible credit management.</p>
      </li>
      <li>
        <strong>How often should I check my credit utilization?</strong>
        <p className="text-base text-gray-700 mb-4">It's a good idea to check your credit utilization monthly to ensure you're staying within a healthy range.</p>
      </li>
    </ul>
  </div>
);

export default CreditUtilizationTracker;


