// /pages/tools/capital-gains-tax-estimator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';

interface UserInput {
  assetName: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
}

interface Result {
  assetName: string;
  capitalGain: number;
  taxEstimate: number;
}

const defaultCategories: UserInput[] = [
  { assetName: 'Stock A', purchasePrice: 100, sellingPrice: 150, quantity: 10 },
];

const CapitalGainsTaxEstimator: React.FC = () => {
  const [userInputs, setUserInputs] = useState<UserInput[]>(defaultCategories);
  const [results, setResults] = useState<Result[]>([]);

  const handleInputChange = (index: number, field: keyof UserInput, value: string | number) => {
    const updatedInputs = [...userInputs];
    (updatedInputs[index][field] as typeof value) = typeof value === 'string' ? parseFloat(value) : value;
    setUserInputs(updatedInputs);
  };

  const calculateResults = () => {
    const calculatedResults = userInputs.map(input => {
      const capitalGain = (input.sellingPrice - input.purchasePrice) * input.quantity;
      const taxEstimate = capitalGain * 0.15; // Assuming a 15% tax rate
      return { assetName: input.assetName, capitalGain, taxEstimate };
    });
    setResults(calculatedResults);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + results.map(r => `${r.assetName},${r.capitalGain},${r.taxEstimate}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'capital_gains_tax_estimate.csv');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Capital Gains Tax Estimator</title>
        <meta name="description" content="Estimate your capital gains tax with our free tool." />
        <meta name="keywords" content="capital gains, tax estimator, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/capital-gains-tax-estimator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Capital Gains Tax Estimator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Capital Gains Tax Estimator. This tool helps you calculate the estimated tax on your capital gains from asset sales.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Enter Your Asset Details</h2>
      {userInputs.map((input, index) => (
        <div key={index} className="mb-4">
          <label className="block text-base text-gray-700 mb-2">
            Asset Name
            <input
              type="text"
              value={input.assetName}
              onChange={(e) => handleInputChange(index, 'assetName', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </label>
          <label className="block text-base text-gray-700 mb-2">
            Purchase Price
            <input
              type="number"
              value={input.purchasePrice}
              onChange={(e) => handleInputChange(index, 'purchasePrice', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </label>
          <label className="block text-base text-gray-700 mb-2">
            Selling Price
            <input
              type="number"
              value={input.sellingPrice}
              onChange={(e) => handleInputChange(index, 'sellingPrice', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </label>
          <label className="block text-base text-gray-700 mb-2">
            Quantity
            <input
              type="number"
              value={input.quantity}
              onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </label>
        </div>
      ))}

      <button
        onClick={calculateResults}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-6"
      >
        Calculate
      </button>

      {results.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            {results.map((result, index) => (
              <li key={index}>
                {result.assetName}: Capital Gain - ${result.capitalGain.toFixed(2)}, Tax Estimate - ${result.taxEstimate.toFixed(2)}
              </li>
            ))}
          </ul>

          <BarChart width={500} height={300} data={results}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="assetName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="capitalGain" fill="#8884d8" />
            <Bar dataKey="taxEstimate" fill="#82ca9d" />
          </BarChart>

          <button
            onClick={exportCSV}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4"
          >
            <Download className="inline-block mr-2" /> Export as CSV
          </button>

          <h3 className="text-xl font-semibold mb-4 mt-8">Tips for Managing Capital Gains</h3>
          <ul className="list-disc list-inside mb-4 text-base">
            <li>Consider holding assets for more than a year to benefit from long-term capital gains tax rates.</li>
            <li>Offset gains with losses to reduce taxable income.</li>
            <li>Consult with a tax professional for personalized advice.</li>
          </ul>
        </>
      )}

      <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">What is capital gains tax?</h3>
        <p className="text-base text-gray-700 mb-4">
          Capital gains tax is a tax on the profit realized from the sale of a non-inventory asset. The most common capital gains are realized from the sale of stocks, bonds, precious metals, and property.
        </p>
        <h3 className="text-xl font-semibold mb-2">How is capital gains tax calculated?</h3>
        <p className="text-base text-gray-700 mb-4">
          Capital gains tax is calculated based on the difference between the selling price and the purchase price of an asset, multiplied by the quantity sold. The tax rate can vary based on the holding period and your tax bracket.
        </p>
      </div>
    </div>
  );
};

export default CapitalGainsTaxEstimator;
