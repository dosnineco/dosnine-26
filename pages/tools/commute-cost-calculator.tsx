

// /pages/tools/commute-cost-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Fuel', 'Maintenance', 'Insurance'];

// Types
interface UserInput {
  category: string;
  cost: number;
}

// Main Component
const CommuteCostCalculator: React.FC = () => {
  // State
  const [inputs, setInputs] = useState<UserInput[]>([]);
  const [results, setResults] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleInputChange = (index: number, field: string, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setInputs(newInputs);
  };

  const addCategory = () => {
    setInputs([...inputs, { category: '', cost: 0 }]);
  };

  const calculateResults = () => {
    const totalCost = inputs.reduce((acc, input) => acc + Number(input.cost), 0);
    setResults(totalCost);
    setChartData(inputs.map(input => ({ name: input.category, cost: Number(input.cost) })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${inputs.map(input => `${input.category},${input.cost}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'commute-costs.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Commute Cost Calculator</title>
        <meta name="description" content="Calculate your commute costs with our free tool." />
        <meta name="keywords" content="commute, cost, calculator, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/commute-cost-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Commute Cost Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Commute Cost Calculator! This tool helps you estimate the total cost of your daily commute. Simply enter your expenses below and see the results.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Enter Your Costs</h2>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <input
              type="text"
              placeholder="Category"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
              className="border p-2 mr-2"
            />
            <input
              type="number"
              placeholder="Cost"
              value={input.cost}
              onChange={(e) => handleInputChange(index, 'cost', e.target.value)}
              className="border p-2"
            />
          </div>
        ))}
        <button onClick={addCategory} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Add Category
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <button onClick={calculateResults} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
          Calculate
        </button>
        <p className="text-base text-gray-700 mb-4">Total Commute Cost: ${results}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4">
          <Download className="inline-block mr-2" /> Export CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Reducing Commute Costs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider carpooling with colleagues to share fuel costs.</li>
          <li>Use public transportation whenever possible.</li>
          <li>Maintain your vehicle regularly to avoid costly repairs.</li>
          <li>Plan your routes to avoid traffic and reduce fuel consumption.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">How accurate is the calculator?</h3>
          <p className="text-base text-gray-700 mb-4">
            The calculator provides an estimate based on the inputs you provide. For precise budgeting, consider additional factors like unexpected repairs or changes in fuel prices.
          </p>
        </div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">Can I save my results?</h3>
          <p className="text-base text-gray-700 mb-4">
            Yes, you can export your results as a CSV file for future reference.
          </p>
        </div>
      </section>
    </div>
  );
};

export default CommuteCostCalculator;


