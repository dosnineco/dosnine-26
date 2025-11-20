
// /pages/tools/grocery-spend-history-analyzer.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface Category {
  name: string;
  amount: number;
}

interface ChartData {
  name: string;
  amount: number;
}

const defaultCategories: Category[] = [
  { name: 'Fruits', amount: 0 },
  { name: 'Vegetables', amount: 0 },
  { name: 'Dairy', amount: 0 },
  { name: 'Meat', amount: 0 },
  { name: 'Grains', amount: 0 },
];

const GrocerySpendHistoryAnalyzer: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totalSpend, setTotalSpend] = useState<number>(0);

  const handleAmountChange = (index: number, amount: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index].amount = amount;
    setCategories(updatedCategories);
    calculateResults(updatedCategories);
  };

  const calculateResults = (categories: Category[]) => {
    const total = categories.reduce((sum, category) => sum + category.amount, 0);
    setTotalSpend(total);
    setChartData(categories.map(category => ({ name: category.name, amount: category.amount })));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Amount\n${categories.map(c => `${c.name},${c.amount}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'grocery_spend_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Grocery Spend History Analyzer</title>
        <meta name="description" content="Analyze your grocery spending history with our free tool." />
        <meta name="keywords" content="grocery, spend, history, analyzer, finance, tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/grocery-spend-history-analyzer" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Grocery Spend History Analyzer</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Grocery Spend History Analyzer. This tool helps you track and analyze your grocery spending habits. Simply enter your spending in each category, and we'll provide insights and tips to help you manage your budget better.
      </p>

      <div className="mb-8">
        {categories.map((category, index) => (
          <div key={index} className="mb-4">
            <label className="block text-xl font-semibold mb-2">{category.name}</label>
            <input
              type="number"
              value={category.amount}
              onChange={(e) => handleAmountChange(index, parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
              aria-label={`Amount spent on ${category.name}`}
            />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Total Spend: ${totalSpend.toFixed(2)}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#3182ce" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-8">
        <Download className="inline-block mr-2" /> Export as CSV
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Plan your meals ahead to avoid impulse buying.</li>
          <li>Buy in bulk for items you use frequently.</li>
          <li>Look for discounts and use coupons whenever possible.</li>
          <li>Consider generic brands to save money.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How do I use this tool? - Enter your spending in each category and view the results.</li>
          <li>Can I add more categories? - Currently, the tool supports default categories, but we plan to add more customization options in the future.</li>
          <li>Is my data saved? - No, all data is processed locally in your browser.</li>
        </ul>
      </div>
    </div>
  );
};

export default GrocerySpendHistoryAnalyzer;


