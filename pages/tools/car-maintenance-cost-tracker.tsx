// /pages/tools/car-maintenance-cost-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { NextPage } from 'next';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Oil Change', 'Tire Rotation', 'Brake Inspection'];

// Types
interface MaintenanceItem {
  category: string;
  cost: number;
}

interface ChartData {
  name: string;
  cost: number;
}

// Main Component
const CarMaintenanceCostTracker: NextPage = () => {
  // State
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [category, setCategory] = useState<string>('');
  const [cost, setCost] = useState<number>(0);

  // Handlers
  const addItem = () => {
    if (category && cost > 0) {
      setItems([...items, { category, cost }]);
      setCategory('');
      setCost(0);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Cost\n${items
      .map(item => `${item.category},${item.cost}`)
      .join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'car-maintenance-costs.csv');
  };

  // Calculation Logic
  const totalCost = items.reduce((acc, item) => acc + item.cost, 0);

  // Chart Data
  const chartData: ChartData[] = items.map(item => ({
    name: item.category,
    cost: item.cost,
  }));

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Car Maintenance Cost Tracker</title>
        <meta name="description" content="Track and manage your car maintenance costs effectively." />
        <meta name="keywords" content="car maintenance, cost tracker, personal finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/car-maintenance-cost-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Car Maintenance Cost Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Keeping track of your car maintenance costs can be a daunting task. With this tool, you can easily log and manage your expenses, ensuring your vehicle stays in top condition without breaking the bank.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Add Maintenance Item</h2>
      <div className="mb-4">
        <label className="block text-base mb-2">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
          placeholder="Enter category"
        />
        <label className="block text-base mb-2">Cost</label>
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="w-full p-2 border border-gray-300 rounded mb-4"
          placeholder="Enter cost"
        />
        <button
          onClick={addItem}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
        >
          Add Item
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Maintenance Items</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        {items.map((item, index) => (
          <li key={index} className="flex justify-between">
            <span>{item.category}: ${item.cost.toFixed(2)}</span>
            <button onClick={() => removeItem(index)} className="text-red-500">Remove</button>
          </li>
        ))}
      </ul>

      <h2 className="text-2xl font-semibold mb-4">Total Cost</h2>
      <p className="text-base text-gray-700 mb-4">${totalCost.toFixed(2)}</p>

      <h2 className="text-2xl font-semibold mb-4">Cost Breakdown</h2>
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
        className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
      >
        <Download className="mr-2" /> Export CSV
      </button>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Tips for Managing Car Maintenance Costs</h2>
      <ul className="list-disc list-inside mb-4 text-base">
        <li>Regularly check your car's manual for recommended maintenance schedules.</li>
        <li>Keep a record of all maintenance activities and costs for future reference.</li>
        <li>Consider using a budgeting app to integrate your car maintenance costs with your overall financial plan.</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Frequently Asked Questions</h2>
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">How often should I track my car maintenance costs?</h3>
        <p className="text-base text-gray-700 mb-4">
          It's a good practice to log your maintenance costs every time you perform a service on your vehicle. This helps in keeping an accurate record and planning future expenses.
        </p>
        <h3 className="text-xl font-semibold mb-2">Can I add custom categories?</h3>
        <p className="text-base text-gray-700 mb-4">
          Yes, you can add any category that suits your maintenance needs. Simply enter the category name and cost in the form above.
        </p>
      </div>
    </div>
  );
};

export default CarMaintenanceCostTracker;
