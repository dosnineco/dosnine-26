import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface UserInput {
  category: string;
  cost: number;
  revenue: number;
}

const defaultCategories: UserInput[] = [
  { category: 'Social Media', cost: 0, revenue: 0 },
  { category: 'Search Engine', cost: 0, revenue: 0 },
  { category: 'Email Marketing', cost: 0, revenue: 0 },
];

const AdvertisingROICalculator: React.FC = () => {
  const [inputs, setInputs] = useState<UserInput[]>(defaultCategories);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleInputChange = (index: number, field: 'cost' | 'revenue', value: number) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const calculateROI = () => {
    const newResults = inputs.map(input =>
      input.cost > 0 ? ((input.revenue - input.cost) / input.cost) * 100 : 0
    );
    setResults(newResults);

    const newChartData = inputs.map((input, index) => ({
      category: input.category,
      ROI: newResults[index],
    }));
    setChartData(newChartData);
  };

  const exportCSV = () => {
    const csvRows = [
      ['Category', 'Cost', 'Revenue', 'ROI'],
      ...inputs.map((input, index) => [
        input.category,
        input.cost,
        input.revenue,
        results[index] ?? 0,
      ]),
    ];
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'advertising_roi.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Advertising ROI Calculator</title>
        <meta name="description" content="Calculate your advertising ROI with our free tool." />
        <meta name="keywords" content="advertising, ROI, calculator, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/advertising-roi-calculator" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Advertising ROI Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Advertising ROI Calculator. This tool helps you evaluate the return on investment for your advertising campaigns. Simply input your costs and revenues for each category, and we'll calculate the ROI for you.
      </p>
      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{input.category}</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-gray-700 mb-2">Cost</label>
                <input
                  type="number"
                  min={0}
                  value={input.cost}
                  onChange={(e) => handleInputChange(index, 'cost', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="flex-1">
                <label className="block text-gray-700 mb-2">Revenue</label>
                <input
                  type="number"
                  min={0}
                  value={input.revenue}
                  onChange={(e) => handleInputChange(index, 'revenue', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={calculateROI}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          aria-label="Calculate ROI"
        >
          Calculate ROI
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ROI" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          <button
            onClick={exportCSV}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
            aria-label="Export as CSV"
          >
            <Download className="mr-2" /> Export as CSV
          </button>
        </div>
      )}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Improving ROI</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Focus on high-performing channels and allocate more budget to them.</li>
          <li>Continuously test and optimize your ad creatives and targeting.</li>
          <li>Analyze customer feedback to improve your product or service offerings.</li>
        </ul>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>
            <strong>What is ROI?</strong> ROI stands for Return on Investment. It measures the gain or loss generated relative to the amount of money invested.
          </li>
          <li>
            <strong>How is ROI calculated?</strong> ROI is calculated by subtracting the initial cost from the final revenue, dividing by the initial cost, and multiplying by 100 to get a percentage.
          </li>
          <li>
            <strong>Why is ROI important?</strong> ROI helps you understand the efficiency of your investments and make informed financial decisions.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AdvertisingROICalculator;