
// /pages/tools/expense-categorization-tool-for-business.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Travel', 'Supplies', 'Utilities', 'Salaries'];

// Types
interface Expense {
  category: string;
  amount: number;
}

interface ChartData {
  name: string;
  value: number;
}

// Main Component
const ExpenseCategorizationTool: React.FC = () => {
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Handlers
  const handleAddExpense = () => {
    if (category && amount > 0) {
      const newExpense = { category, amount };
      setExpenses([...expenses, newExpense]);
      updateChartData([...expenses, newExpense]);
      setCategory('');
      setAmount(0);
    }
  };

  const updateChartData = (expenses: Expense[]) => {
    const data = DEFAULT_CATEGORIES.map((cat) => {
      const total = expenses
        .filter((expense) => expense.category === cat)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return { name: cat, value: total };
    });
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + 'Category,Amount\n'
      + expenses.map(e => `${e.category},${e.amount}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'expenses.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Expense Categorization Tool for Business</title>
        <meta name="description" content="A free tool to categorize and analyze your business expenses." />
        <meta name="keywords" content="expense, categorization, business, finance, tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/expense-categorization-tool-for-business" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Expense Categorization Tool for Business</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Expense Categorization Tool for Business. This tool helps you categorize and analyze your business expenses efficiently.
      </p>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Add Expense</h2>
        <div className="flex flex-col md:flex-row mb-4">
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-2 mb-2 md:mb-0 md:mr-2 flex-1"
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="border p-2 mb-2 md:mb-0 md:mr-2 flex-1"
          />
          <button
            onClick={handleAddExpense}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Expense Chart</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Expenses</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly review your expenses to identify unnecessary costs.</li>
          <li>Set a budget for each category and stick to it.</li>
          <li>Use this tool to track and analyze your spending patterns.</li>
        </ul>
      </div>

      <div className="mb-8">
        <button
          onClick={exportCSV}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
        >
          <Download className="mr-2" /> Export as CSV
        </button>
      </div>

      <FAQSection />
    </div>
  );
};

// FAQ Component
const FAQSection: React.FC = () => (
  <div className="mb-8">
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <div className="text-base text-gray-700 mb-4">
      <h3 className="text-xl font-semibold mb-2">What is this tool for?</h3>
      <p>This tool helps you categorize and analyze your business expenses.</p>
    </div>
    <div className="text-base text-gray-700 mb-4">
      <h3 className="text-xl font-semibold mb-2">How do I add an expense?</h3>
      <p>Enter the category and amount, then click "Add".</p>
    </div>
    <div className="text-base text-gray-700 mb-4">
      <h3 className="text-xl font-semibold mb-2">Can I export my data?</h3>
      <p>Yes, you can export your data as a CSV file.</p>
    </div>
  </div>
);

export default ExpenseCategorizationTool;


