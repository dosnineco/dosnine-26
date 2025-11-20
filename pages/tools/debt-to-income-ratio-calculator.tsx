
// /pages/tools/debt-to-income-ratio-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

interface UserInput {
  category: string;
  amount: number;
}

const defaultCategories: UserInput[] = [
  { category: 'Monthly Income', amount: 0 },
  { category: 'Monthly Debt Payments', amount: 0 },
];

const DebtToIncomeRatioCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<UserInput[]>(defaultCategories);
  const [result, setResult] = useState<number | null>(null);

  const handleInputChange = (index: number, field: 'category' | 'amount', value: string) => {
    const updatedInputs = [...inputs];
    if (field === 'amount') {
      updatedInputs[index].amount = parseFloat(value);
    } else {
      updatedInputs[index].category = value;
    }
    setInputs(updatedInputs);
  };

  const addCategory = () => {
    setInputs([...inputs, { category: '', amount: 0 }]);
  };

  const removeCategory = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const calculateDTI = () => {
    const income = inputs.find(input => input.category === 'Monthly Income')?.amount || 0;
    const debt = inputs.find(input => input.category === 'Monthly Debt Payments')?.amount || 0;
    if (income > 0) {
      setResult((debt / income) * 100);
    } else {
      setResult(null);
    }
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${inputs.map(input => `${input.category},${input.amount}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'debt-to-income-ratio.csv');
  };

  const chartData = inputs.map(input => ({
    name: input.category,
    value: input.amount,
  }));

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Debt-to-Income Ratio Calculator</title>
        <meta name="description" content="Calculate your debt-to-income ratio with our free tool." />
        <meta name="keywords" content="debt, income, finance, calculator" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/debt-to-income-ratio-calculator" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Debt-to-Income Ratio Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Understanding your debt-to-income ratio is crucial for managing your finances. This tool helps you calculate it easily.
      </p>
      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base font-semibold mb-2">
              {input.category || `Category ${index + 1}`}
            </label>
            <input
              type="text"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-2"
              placeholder="Category"
            />
            <input
              type="number"
              value={input.amount}
              onChange={(e) => handleInputChange(index, 'amount', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Amount"
            />
            {index >= 2 && (
              <button
                onClick={() => removeCategory(index)}
                className="text-red-500 mt-2"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">
          Add Category
        </button>
        <button onClick={calculateDTI} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-4">
          Calculate DTI
        </button>
        {result !== null && (
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-4">Results</h2>
            <p className="text-base text-gray-700 mb-4">
              Your Debt-to-Income Ratio is: <strong>{result.toFixed(2)}%</strong>
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mt-4">
              <Download className="inline-block mr-2" /> Export as CSV
            </button>
          </div>
        )}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4">Tips</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>Keep your DTI ratio below 36% for better financial health.</li>
            <li>Consider reducing debt or increasing income to improve your ratio.</li>
            <li>Regularly monitor your DTI to stay on top of your finances.</li>
          </ul>
        </div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>What is a good debt-to-income ratio?</li>
            <li>How can I improve my debt-to-income ratio?</li>
            <li>Why is the debt-to-income ratio important?</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DebtToIncomeRatioCalculator;


