
// /pages/tools/fashion-purchase-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Clothing', 'Shoes', 'Accessories'];

// Types
interface Purchase {
  category: string;
  item: string;
  cost: number;
}

// Main Component
const FashionPurchaseTracker: React.FC = () => {
  // State
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [item, setItem] = useState<string>('');
  const [cost, setCost] = useState<number>(0);

  // Handlers
  const addPurchase = () => {
    setPurchases([...purchases, { category, item, cost }]);
    setItem('');
    setCost(0);
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Item,Cost\n' +
      purchases.map(p => `${p.category},${p.item},${p.cost}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'fashion-purchases.csv');
  };

  // Calculation Logic
  const totalCost = purchases.reduce((acc, purchase) => acc + purchase.cost, 0);

  // Chart Data
  const chartData = DEFAULT_CATEGORIES.map(category => ({
    category,
    total: purchases.filter(p => p.category === category).reduce((acc, p) => acc + p.cost, 0),
  }));

  // UI Rendering
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Fashion Purchase Tracker</title>
        <meta name="description" content="Track your fashion purchases and manage your budget effectively." />
        <meta name="keywords" content="fashion, purchase tracker, budget, finance" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/fashion-purchase-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Fashion Purchase Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to your personal Fashion Purchase Tracker. Here, you can easily log your fashion-related expenses and keep track of your spending habits. Let's get started!
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Add a Purchase</h2>
        <form className="mb-4">
          <div className="mb-4">
            <label className="block text-base font-semibold mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-base font-semibold mb-2">Item</label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-base font-semibold mb-2">Cost</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <button
            type="button"
            onClick={addPurchase}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Add Purchase
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-base text-gray-700 mb-4">Total Spent: ${totalCost.toFixed(2)}</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        <button
          onClick={exportCSV}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
        >
          <Download className="mr-2" /> Export CSV
        </button>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Your Fashion Budget</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Set a monthly budget for fashion purchases and stick to it.</li>
          <li>Prioritize quality over quantity to make your wardrobe last longer.</li>
          <li>Take advantage of sales and discounts to save money.</li>
          <li>Regularly review your spending to identify areas for improvement.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li><strong>How do I add a new category?</strong> Currently, categories are predefined. Future updates may allow custom categories.</li>
          <li><strong>Can I edit or delete a purchase?</strong> Editing and deleting features are planned for future updates.</li>
          <li><strong>Is my data saved?</strong> Data is stored locally in your browser and not sent to any server.</li>
        </ul>
      </section>
    </div>
  );
};

export default FashionPurchaseTracker;


