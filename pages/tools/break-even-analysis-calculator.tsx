
// /pages/tools/break-even-analysis-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download } from 'lucide-react';

interface UserInput {
  category: string;
  fixedCosts: number;
  variableCosts: number;
  pricePerUnit: number;
}

interface ChartData {
  name: string;
  value: number;
}

const defaultCategories: UserInput[] = [
  { category: 'Product A', fixedCosts: 1000, variableCosts: 5, pricePerUnit: 10 },
];

const BreakEvenAnalysisCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<UserInput[]>(defaultCategories);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (index: number, field: keyof UserInput, value: string) => {
    const newInputs = [...inputs];
    if (field === 'category') {
      newInputs[index][field] = value as UserInput['category'];
    } else {
      newInputs[index][field] = parseFloat(value) as UserInput[typeof field];
    }
    setInputs(newInputs);
  };

  const calculateBreakEven = () => {
    const newResults = inputs.map(input => {
      const breakEvenPoint = input.fixedCosts / (input.pricePerUnit - input.variableCosts);
      return breakEvenPoint;
    });
    setResults(newResults);

    const newChartData = inputs.map((input, index) => ({
      name: input.category,
      value: newResults[index],
    }));
    setChartData(newChartData);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + inputs.map((input, index) => `${input.category},${results[index]}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'break_even_analysis.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Break-even Analysis Calculator</title>
        <meta name="description" content="Calculate your break-even point with our free tool." />
        <meta name="keywords" content="break-even, finance, calculator" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/break-even-analysis-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Break-even Analysis Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Break-even Analysis Calculator. This tool helps you determine the point at which your business will start to make a profit. Simply input your fixed costs, variable costs, and price per unit to get started.
      </p>

      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <input
              type="text"
              value={input.category}
              onChange={(e) => handleInputChange(index, 'category', e.target.value)}
              placeholder="Category"
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              value={input.fixedCosts}
              onChange={(e) => handleInputChange(index, 'fixedCosts', e.target.value)}
              placeholder="Fixed Costs"
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              value={input.variableCosts}
              onChange={(e) => handleInputChange(index, 'variableCosts', e.target.value)}
              placeholder="Variable Costs"
              className="border p-2 mb-2 w-full"
            />
            <input
              type="number"
              value={input.pricePerUnit}
              onChange={(e) => handleInputChange(index, 'pricePerUnit', e.target.value)}
              placeholder="Price Per Unit"
              className="border p-2 mb-2 w-full"
            />
          </div>
        ))}
        <button onClick={calculateBreakEven} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300">
          Calculate
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <ul className="list-disc list-inside mb-4 text-base">
            {results.map((result, index) => (
              <li key={index}>{inputs[index].category}: Break-even at {result.toFixed(2)} units</li>
            ))}
          </ul>

          <BarChart width={600} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>

          <button onClick={exportCSV} className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center">
            <Download className="mr-2" /> Export CSV
          </button>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly update your costs to ensure accurate break-even analysis.</li>
          <li>Consider different scenarios by adjusting your price per unit.</li>
          <li>Use the results to make informed pricing and production decisions.</li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>What is a break-even analysis? It's a calculation to determine when your business will be able to cover all its expenses and start making a profit.</li>
          <li>Why is break-even analysis important? It helps you understand the minimum sales needed to avoid losses.</li>
          <li>How often should I perform a break-even analysis? Regularly, especially when costs or pricing change.</li>
        </ul>
      </div>
    </div>
  );
};

export default BreakEvenAnalysisCalculator;
