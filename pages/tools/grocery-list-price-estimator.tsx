

// /pages/tools/grocery-list-price-estimator.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface Item {
  name: string;
  price: number;
}

interface Category {
  name: string;
  items: Item[];
}

const defaultCategories: Category[] = [
  { name: 'Fruits', items: [{ name: 'Apple', price: 1.2 }, { name: 'Banana', price: 0.5 }] },
  { name: 'Vegetables', items: [{ name: 'Carrot', price: 0.7 }, { name: 'Broccoli', price: 1.1 }] },
];

const GroceryListPriceEstimator: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [results, setResults] = useState<number[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const calculateTotal = () => {
    const totals = categories.map(category =>
      category.items.reduce((sum, item) => sum + item.price, 0)
    );
    setResults(totals);
    setChartData(categories.map((category, index) => ({ name: category.name, Total: totals[index] })));
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + categories.map(category => `${category.name},${category.items.map(item => item.price).join(',')}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'grocery_list.csv');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Grocery List Price Estimator</title>
        <meta name="description" content="Estimate your grocery list prices with our free tool." />
        <meta name="keywords" content="grocery, price estimator, shopping list, budget" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/grocery-list-price-estimator" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Grocery List Price Estimator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Grocery List Price Estimator! This tool helps you estimate the total cost of your grocery list based on current prices. Simply add your items and their prices, and let us do the rest.
      </p>
      <button onClick={calculateTotal} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mb-4">
        Calculate Total
      </button>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="Total" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
      <button onClick={exportCSV} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4">
        <Download className="inline-block mr-2" /> Export as CSV
      </button>
      <Tips />
      <FAQ />
    </div>
  );
};

const Tips: React.FC = () => (
  <section>
    <h2 className="text-2xl font-semibold mb-4">Tips for Saving on Groceries</h2>
    <ul className="list-disc list-inside mb-4 text-base">
      <li>Plan your meals for the week and make a list.</li>
      <li>Buy in bulk for items you use frequently.</li>
      <li>Look for sales and use coupons.</li>
      <li>Consider store brands for better prices.</li>
    </ul>
  </section>
);

const FAQ: React.FC = () => (
  <section>
    <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">How accurate are the price estimates?</h3>
      <p className="text-base text-gray-700 mb-4">
        The estimates are based on average prices and may vary depending on your location and store.
      </p>
    </div>
    <div className="mb-4">
      <h3 className="text-xl font-semibold mb-2">Can I add my own items?</h3>
      <p className="text-base text-gray-700 mb-4">
        Yes, you can customize the list by adding your own items and prices.
      </p>
    </div>
  </section>
);

export default GroceryListPriceEstimator;


