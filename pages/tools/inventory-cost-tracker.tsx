
// /pages/tools/inventory-cost-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Electronics', 'Furniture', 'Clothing'];

// Types
interface Item {
  name: string;
  category: string;
  cost: number;
}

// Main Component
const InventoryCostTracker: React.FC = () => {
  // State
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<Item>({ name: '', category: DEFAULT_CATEGORIES[0], cost: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  // Handlers
  const handleAddItem = () => {
    setItems([...items, newItem]);
    setNewItem({ name: '', category: DEFAULT_CATEGORIES[0], cost: 0 });
    updateChartData([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    updateChartData(updatedItems);
  };

  const updateChartData = (items: Item[]) => {
    const data = DEFAULT_CATEGORIES.map(category => ({
      category,
      totalCost: items.filter(item => item.category === category).reduce((sum, item) => sum + item.cost, 0),
    }));
    setChartData(data);
  };

  const exportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Category,Name,Cost\n${items.map(item => `${item.category},${item.name},${item.cost}`).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'inventory-costs.csv');
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Inventory Cost Tracker</title>
        <meta name="description" content="Track and manage your inventory costs with ease." />
        <meta name="keywords" content="inventory, cost tracker, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/inventory-cost-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Inventory Cost Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Inventory Cost Tracker! This tool helps you manage and track the costs of your inventory items across different categories.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Add New Item</h2>
        <form className="mb-4">
          <div className="mb-4">
            <label className="block text-base font-semibold mb-2" htmlFor="itemName">Item Name</label>
            <input
              type="text"
              id="itemName"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="mb-4">
            <label className="block text-base font-semibold mb-2" htmlFor="itemCategory">Category</label>
            <select
              id="itemCategory"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {DEFAULT_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-base font-semibold mb-2" htmlFor="itemCost">Cost</label>
            <input
              type="number"
              id="itemCost"
              value={newItem.cost}
              onChange={(e) => setNewItem({ ...newItem, cost: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Add Item
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Inventory List</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          {items.map((item, index) => (
            <li key={index} className="flex justify-between items-center mb-2">
              <span>{item.name} - {item.category} - ${item.cost.toFixed(2)}</span>
              <button
                onClick={() => handleRemoveItem(index)}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Cost Analysis</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalCost" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Inventory Costs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Regularly review your inventory to identify slow-moving items.</li>
          <li>Negotiate better prices with suppliers to reduce costs.</li>
          <li>Consider bulk purchasing for frequently used items.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li><strong>How do I add a new category?</strong> Currently, categories are predefined. Future updates may allow custom categories.</li>
          <li><strong>Can I export my data?</strong> Yes, you can export your inventory data as a CSV file.</li>
        </ul>
      </section>

      <button
        onClick={exportCSV}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
      >
        <Download className="inline-block mr-2" /> Export as CSV
      </button>
    </div>
  );
};

export default InventoryCostTracker;


