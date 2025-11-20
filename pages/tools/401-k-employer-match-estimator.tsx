
// /pages/tools/401-k-employer-match-estimator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface UserInput {
  salary: number;
  contribution: number;
  employerMatch: number;
}

interface ChartData {
  name: string;
  value: number;
}

const defaultUserInput: UserInput = {
  salary: 50000,
  contribution: 5,
  employerMatch: 3,
};

const calculateEmployerMatch = (input: UserInput): number => {
  return (input.salary * (input.contribution / 100)) * (input.employerMatch / 100);
};

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <div className="mb-4">
    <h3 className="text-xl font-semibold">{question}</h3>
    <p className="text-base text-gray-700">{answer}</p>
  </div>
);

const Tips: React.FC = () => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Maximizing Your 401(k)</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Contribute enough to get the full employer match.</li>
      <li>Increase your contribution rate annually.</li>
      <li>Consider the tax advantages of 401(k) contributions.</li>
    </ul>
  </div>
);

const EmployerMatchEstimator: React.FC = () => {
  const [userInput, setUserInput] = useState<UserInput>(defaultUserInput);
  const [result, setResult] = useState<number>(calculateEmployerMatch(defaultUserInput));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInput((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleCalculate = () => {
    setResult(calculateEmployerMatch(userInput));
  };

  const chartData: ChartData[] = [
    { name: 'Your Contribution', value: userInput.salary * (userInput.contribution / 100) },
    { name: 'Employer Match', value: result },
  ];

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Name,Value\nYour Contribution,${chartData[0].value}\nEmployer Match,${chartData[1].value}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', '401k_employer_match.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>401(k) Employer Match Estimator</title>
        <meta name="description" content="Estimate your 401(k) employer match with our free tool." />
        <meta name="keywords" content="401k, employer match, retirement, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/401-k-employer-match-estimator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">401(k) Employer Match Estimator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the 401(k) Employer Match Estimator. This tool helps you calculate the potential employer match based on your salary and contribution rate.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Enter Your Details</h2>
        <form className="space-y-4">
          <div>
            <label htmlFor="salary" className="block text-base font-medium text-gray-700">Annual Salary ($)</label>
            <input
              type="number"
              id="salary"
              name="salary"
              value={userInput.salary}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="contribution" className="block text-base font-medium text-gray-700">Your Contribution (%)</label>
            <input
              type="number"
              id="contribution"
              name="contribution"
              value={userInput.contribution}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="employerMatch" className="block text-base font-medium text-gray-700">Employer Match (%)</label>
            <input
              type="number"
              id="employerMatch"
              name="employerMatch"
              value={userInput.employerMatch}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleCalculate}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Calculate
          </button>
        </form>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Estimated Employer Match: ${result.toFixed(2)}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
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

      <Tips />

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <FAQItem
          question="What is a 401(k) employer match?"
          answer="A 401(k) employer match is a contribution your employer makes to your 401(k) account, typically matching a percentage of your own contributions."
        />
        <FAQItem
          question="How can I maximize my employer match?"
          answer="To maximize your employer match, contribute at least the amount your employer is willing to match."
        />
      </div>
    </div>
  );
};

export default EmployerMatchEstimator;
