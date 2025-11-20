
// /pages/tools/budget-variance-analyzer.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Housing', 'Food', 'Transportation', 'Entertainment', 'Utilities'];

// Types
interface BudgetItem {
  category: string;
  planned: number;
  actual: number;
}

interface ChartData {
  name: string;
  Planned: number;
  Actual: number;
}

// Main Component
const BudgetVarianceAnalyzer: React.FC = () => {
  // State
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(DEFAULT_CATEGORIES.map(category => ({
    category,
    planned: 0,
    actual: 0,
  })));
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleInputChange = (index: number, field: 'planned' | 'actual', value: number) => {
    const updatedItems = [...budgetItems];
    updatedItems[index][field] = value;
    setBudgetItems(updatedItems);
    updateChartData(updatedItems);
  };

  const updateChartData = (items: BudgetItem[]) => {
    const data = items.map(item => ({
      name: item.category,
      Planned: item.planned,
      Actual: item.actual,
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Planned,Actual\n' +
      budgetItems.map(item => `${item.category},${item.planned},${item.actual}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'budget-variance.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Budget Variance Analyzer</title>
        <meta name="description" content="Analyze your budget variance with our free tool." />
        <meta name="keywords" content="budget, finance, variance, analyzer, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/budget-variance-analyzer" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Budget Variance Analyzer</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Budget Variance Analyzer! This tool helps you compare your planned budget against your actual spending. Let's get started.
      </p>

      <div className="mb-8">
        {budgetItems.map((item, index) => (
          <div key={index} className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{item.category}</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-gray-700">Planned</label>
                <input
                  type="number"
                  value={item.planned}
                  onChange={(e) => handleInputChange(index, 'planned', parseFloat(e.target.value))}
                  className="border rounded-lg px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700">Actual</label>
                <input
                  type="number"
                  value={item.actual}
                  onChange={(e) => handleInputChange(index, 'actual', parseFloat(e.target.value))}
                  className="border rounded-lg px-3 py-2 w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="Planned" fill="#8884d8" />
          <Bar dataKey="Actual" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>

      <button
        onClick={exportCSV}
        className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
        <Download className="inline-block mr-2" /> Export as CSV
      </button>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Your Budget</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly review your budget to identify areas for improvement.</li>
          <li>Set realistic goals and adjust your budget as needed.</li>
          <li>Use budgeting apps to track your expenses on the go.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li><strong>What is budget variance?</strong> Budget variance is the difference between your planned budget and actual spending.</li>
          <li><strong>How often should I analyze my budget?</strong> It's recommended to review your budget monthly to stay on track.</li>
          <li><strong>Can I add more categories?</strong> Yes, you can customize the tool to fit your needs by adding more categories.</li>
        </ul>
      </section>
    </div>
  );
};

export default BudgetVarianceAnalyzer;
