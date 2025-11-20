

// /pages/tools/home-office-setup-cost-tool.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface Category {
  name: string;
  items: Item[];
}

interface Item {
  name: string;
  cost: number;
}

interface UserInput {
  categories: Category[];
}

const defaultCategories: Category[] = [
  { name: 'Furniture', items: [{ name: 'Desk', cost: 200 }, { name: 'Chair', cost: 150 }] },
  { name: 'Electronics', items: [{ name: 'Monitor', cost: 300 }, { name: 'Keyboard', cost: 50 }] },
];

const HomeOfficeSetupCostTool: React.FC = () => {
  const [userInput, setUserInput] = useState<UserInput>({ categories: defaultCategories });
  const [totalCost, setTotalCost] = useState<number>(0);

  const calculateTotalCost = () => {
    const cost = userInput.categories.reduce((acc, category) => {
      return acc + category.items.reduce((sum, item) => sum + item.cost, 0);
    }, 0);
    setTotalCost(cost);
  };

  const handleCostChange = (categoryIndex: number, itemIndex: number, cost: number) => {
    const updatedCategories = [...userInput.categories];
    updatedCategories[categoryIndex].items[itemIndex].cost = cost;
    setUserInput({ categories: updatedCategories });
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + userInput.categories.map(category => 
        category.items.map(item => `${category.name},${item.name},${item.cost}`).join('\n')
      ).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'home_office_setup_cost.csv');
    document.body.appendChild(link);
    link.click();
  };

  const chartData = userInput.categories.flatMap(category => 
    category.items.map(item => ({ name: item.name, cost: item.cost }))
  );

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Home Office Setup Cost Tool</title>
        <meta name="description" content="Calculate the cost of setting up your home office with our free tool." />
        <meta name="keywords" content="home office, setup cost, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/home-office-setup-cost-tool" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Home Office Setup Cost Tool</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Home Office Setup Cost Tool. This tool helps you estimate the cost of setting up your home office by allowing you to input various items and their costs. Let's get started!
      </p>

      <div>
        {userInput.categories.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
            <ul className="list-disc list-inside mb-4 text-base">
              {category.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <label className="block">
                    {item.name}: 
                    <input
                      type="number"
                      value={item.cost}
                      onChange={(e) => handleCostChange(categoryIndex, itemIndex, parseFloat(e.target.value))}
                      className="ml-2 p-1 border rounded"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={calculateTotalCost}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
        Calculate Total Cost
      </button>

      <h2 className="text-2xl font-semibold mt-6 mb-4">Total Cost: ${totalCost}</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="cost" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <button
        onClick={exportCSV}
        className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
        <Download className="inline-block mr-2" /> Export as CSV
      </button>

      <TipsSection />
      <FAQSection />
    </div>
  );
};

const TipsSection: React.FC = () => (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Tips for Setting Up Your Home Office</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Consider ergonomic furniture to improve comfort and productivity.</li>
      <li>Invest in good lighting to reduce eye strain.</li>
      <li>Keep your workspace organized to maintain focus.</li>
    </ul>
  </div>
);

const FAQSection: React.FC = () => (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>
        <strong>How accurate is this tool?</strong>
        <p className="text-base text-gray-700 mb-4">The tool provides an estimate based on the inputs you provide. For precise budgeting, consider additional factors like taxes and shipping costs.</p>
      </li>
      <li>
        <strong>Can I add more categories?</strong>
        <p className="text-base text-gray-700 mb-4">Currently, the tool supports predefined categories. Future updates may include the ability to add custom categories.</p>
      </li>
    </ul>
  </div>
);

export default HomeOfficeSetupCostTool;


