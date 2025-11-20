
// /pages/tools/line-of-credit-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface LineOfCreditInput {
  category: string;
  amount: number;
}

const defaultCategories = [
  { category: 'Groceries', amount: 0 },
  { category: 'Utilities', amount: 0 },
  { category: 'Rent', amount: 0 },
];

const LineOfCreditTracker: React.FC = () => {
  const [inputs, setInputs] = useState<LineOfCreditInput[]>(defaultCategories);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleInputChange = (index: number, field: string, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: field === 'amount' ? parseFloat(value) : value };
    setInputs(newInputs);
  };

  const calculateResults = () => {
    const total = inputs.reduce((acc, curr) => acc + curr.amount, 0);
    setResults([total]);
    setChartData(inputs.map(input => ({ name: input.category, amount: input.amount })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${inputs.map(input => `${input.category},${input.amount}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'line_of_credit.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Line of Credit Tracker</title>
        <meta name="description" content="Track your line of credit with ease using our free tool." />
        <meta name="keywords" content="line of credit, finance tool, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/line-of-credit-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Line of Credit Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Line of Credit Tracker! This tool helps you manage and track your line of credit by categorizing your expenses.
      </p>

      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base font-semibold mb-2">
              {input.category}
            </label>
            <input
              type="number"
              value={input.amount}
              onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              aria-label={`Amount for ${input.category}`}
            />
          </div>
        ))}
      </div>

      <button
        onClick={calculateResults}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6"
      >
        Calculate
      </button>

      {results.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">Total Line of Credit Used: ${results[0]}</p>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>

          <button
            onClick={exportCSV}
            className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-6"
          >
            <Download className="mr-2" /> Export as CSV
          </button>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Your Line of Credit</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly review your expenses to stay within your credit limit.</li>
          <li>Set up alerts for due dates to avoid late fees.</li>
          <li>Consider consolidating debts to lower interest rates.</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How do I add a new category? - You can add new categories by modifying the defaultCategories array in the code.</li>
          <li>Can I track multiple lines of credit? - Yes, simply add more categories to represent different lines of credit.</li>
          <li>Is my data saved? - No, this tool does not save your data. Please export your results if needed.</li>
        </ul>
      </div>
    </div>
  );
};

export default LineOfCreditTracker;


