
// /pages/tools/e-commerce-fee-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { CSVLink } from 'react-csv';

// Constants
const DEFAULT_CATEGORIES = [
  { name: 'Electronics', fee: 0.15 },
  { name: 'Clothing', fee: 0.12 },
  { name: 'Books', fee: 0.10 },
];

// Types
interface Category {
  name: string;
  fee: number;
}

interface UserInput {
  category: string;
  price: number;
}

// Main Component
const ECommerceFeeCalculator: React.FC = () => {
  // State
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleAddInput = () => {
    setUserInputs([...userInputs, { category: '', price: 0 }]);
  };

  const handleInputChange = (index: number, field: keyof UserInput, value: string | number) => {
    const newInputs: UserInput[] = [...userInputs];
    newInputs[index] = {
      ...newInputs[index],
      [field]: value,
    };
    setUserInputs(newInputs);
  };

  const calculateFees = () => {
    const newResults = userInputs.map(input => {
      const category = DEFAULT_CATEGORIES.find(cat => cat.name === input.category);
      return category ? input.price * category.fee : 0;
    });
    setResults(newResults);
    prepareChartData(newResults);
  };

  const prepareChartData = (results: number[]) => {
    const data = userInputs.map((input, index) => ({
      name: input.category || `Item ${index + 1}`,
      Price: input.price,
      Fee: results[index],
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvData = userInputs.map((input, index) => ({
      Category: input.category,
      Price: input.price,
      Fee: results[index],
    }));
    return csvData;
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>E-commerce Fee Calculator</title>
        <meta name="description" content="Calculate fees for your e-commerce sales easily." />
        <meta name="keywords" content="e-commerce, fee calculator, sales, online business" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/e-commerce-fee-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">E-commerce Fee Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the E-commerce Fee Calculator! This tool helps you estimate the fees associated with selling your products online. Simply enter your product details, and we'll do the rest.
      </p>

      <div className="mb-4">
        {userInputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base font-semibold mb-2">Category</label>
            <select
              className="w-full p-2 border border-gray-300 rounded mb-2"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
            >
              <option value="">Select Category</option>
              {DEFAULT_CATEGORIES.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <label className="block text-base font-semibold mb-2">Price</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded"
              value={input.price}
              onChange={(e) => handleInputChange(index, 'price', parseFloat(e.target.value))}
            />
          </div>
        ))}
        <button
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-400"
          onClick={handleAddInput}
        >
          Add Item
        </button>
      </div>

      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 mb-4"
        onClick={calculateFees}
      >
        Calculate Fees
      </button>

      {results.length > 0 && (
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Price" fill="#8884d8" />
              <Bar dataKey="Fee" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
          <CSVLink
            data={exportCSV()}
            filename="ecommerce-fees.csv"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 mt-4 inline-block"
          >
            <Download className="inline-block mr-2" />
            Export as CSV
          </CSVLink>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-semibold mb-4">Tips for Reducing Fees</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider bulk shipping to reduce costs.</li>
          <li>Negotiate better rates with your platform.</li>
          <li>Optimize your product listings to increase sales volume.</li>
        </ul>
      </div>

      <FAQSection />
    </div>
  );
};

// FAQ Component
const FAQSection: React.FC = () => (
  <div className="mb-4">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>How are fees calculated? Fees are based on the category and price of the item.</li>
      <li>Can I add custom categories? Currently, only default categories are supported.</li>
      <li>How can I export my results? Use the "Export as CSV" button to download your data.</li>
    </ul>
  </div>
);

export default ECommerceFeeCalculator;


