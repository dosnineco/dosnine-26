

// /pages/tools/childcare-cost-calculator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface ChildcareCostCalculatorProps {}

interface UserInput {
  category: string;
  cost: number;
}

interface ChartData {
  name: string;
  cost: number;
}

const defaultCategories: UserInput[] = [
  { category: 'Daycare', cost: 0 },
  { category: 'Babysitter', cost: 0 },
  { category: 'Nanny', cost: 0 },
];

const ChildcareCostCalculator: React.FC<ChildcareCostCalculatorProps> = () => {
  const [inputs, setInputs] = useState<UserInput[]>(defaultCategories);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (index: number, value: number) => {
    const newInputs = [...inputs];
    newInputs[index].cost = value;
    setInputs(newInputs);
    calculateTotalCost(newInputs);
  };

  const calculateTotalCost = (inputs: UserInput[]) => {
    const total = inputs.reduce((sum, input) => sum + input.cost, 0);
    setTotalCost(total);
    prepareChartData(inputs);
  };

  const prepareChartData = (inputs: UserInput[]) => {
    const data = inputs.map(input => ({ name: input.category, cost: input.cost }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${inputs.map(input => `${input.category},${input.cost}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'childcare_costs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Childcare Cost Calculator</title>
        <meta name="description" content="Calculate your childcare costs with our free tool." />
        <meta name="keywords" content="childcare, cost calculator, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/childcare-cost-calculator" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Childcare Cost Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Childcare Cost Calculator. This tool helps you estimate your monthly childcare expenses. Simply enter your costs for each category, and we'll do the rest!
      </p>

      <div>
        {inputs.map((input, index) => (
          <div key={index} className="mb-4">
            <label className="block text-base font-semibold mb-2">{input.category}</label>
            <input
              type="number"
              value={input.cost}
              onChange={(e) => handleInputChange(index, parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              aria-label={`Cost for ${input.category}`}
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Total Cost: ${totalCost}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="#3182ce" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button
        onClick={exportCSV}
        className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
        <Download className="inline-block mr-2" /> Export as CSV
      </button>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

const TipsSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Reducing Childcare Costs</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Consider sharing a nanny with another family to split costs.</li>
      <li>Look for local childcare co-ops or community programs.</li>
      <li>Explore flexible work arrangements to reduce the need for full-time care.</li>
    </ul>
  </section>
);

const FAQSection: React.FC = () => (
  <section className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>How accurate is this calculator?</strong>
        <p className="text-base text-gray-700 mb-4">The calculator provides estimates based on the inputs you provide. Actual costs may vary.</p>
      </li>
      <li>
        <strong>Can I add more categories?</strong>
        <p className="text-base text-gray-700 mb-4">Currently, the tool supports predefined categories. Future updates may allow custom categories.</p>
      </li>
      <li>
        <strong>Is my data saved?</strong>
        <p className="text-base text-gray-700 mb-4">No, your data is not saved or stored. It's only used for the current session.</p>
      </li>
    </ul>
  </section>
);

export default ChildcareCostCalculator;


