
// /pages/tools/fitness-membership-cost-tracker.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

// Constants
const DEFAULT_CATEGORIES = ['Gym', 'Yoga', 'Swimming', 'Dance'];

// Types
interface MembershipCost {
  category: string;
  monthlyCost: number;
}

// Main Component
const FitnessMembershipCostTracker: React.FC = () => {
  // State
  const [memberships, setMemberships] = useState<MembershipCost[]>([]);
  const [category, setCategory] = useState<string>('');
  const [monthlyCost, setMonthlyCost] = useState<number>(0);

  // Handlers
  const addMembership = () => {
    if (category && monthlyCost > 0) {
      setMemberships([...memberships, { category, monthlyCost }]);
      setCategory('');
      setMonthlyCost(0);
    }
  };

  const removeMembership = (index: number) => {
    setMemberships(memberships.filter((_, i) => i !== index));
  };

  const exportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Category,Monthly Cost\n' +
      memberships.map(m => `${m.category},${m.monthlyCost}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, 'membership_costs.csv');
  };

  // Calculation Logic
  const totalCost = memberships.reduce((acc, curr) => acc + curr.monthlyCost, 0);

  // Chart Data
  const chartData = memberships.map(m => ({
    name: m.category,
    cost: m.monthlyCost,
  }));

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Fitness Membership Cost Tracker</title>
        <meta name="description" content="Track and manage your fitness membership costs with ease." />
        <meta name="keywords" content="fitness, membership, cost, tracker, gym, yoga" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/fitness-membership-cost-tracker" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Fitness Membership Cost Tracker</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to your personal Fitness Membership Cost Tracker. Here, you can easily manage and track the costs of your various fitness memberships. Whether it's the gym, yoga, or any other fitness activity, keep your expenses in check with our tool.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Add Membership</h2>
        <div className="mb-4">
          <label className="block text-base mb-2">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-4"
            placeholder="e.g., Gym"
          />
          <label className="block text-base mb-2">Monthly Cost</label>
          <input
            type="number"
            value={monthlyCost}
            onChange={(e) => setMonthlyCost(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded mb-4"
            placeholder="e.g., 50"
          />
          <button
            onClick={addMembership}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Add Membership
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Memberships</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          {memberships.map((m, index) => (
            <li key={index} className="flex justify-between items-center mb-2">
              <span>{m.category}: ${m.monthlyCost}</span>
              <button
                onClick={() => removeMembership(index)}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <p className="text-base text-gray-700 mb-4">Total Monthly Cost: ${totalCost}</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Cost Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Tips for Managing Costs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider annual memberships for discounts.</li>
          <li>Look for promotions or group discounts.</li>
          <li>Evaluate your usage and adjust memberships accordingly.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>How do I add a new category? - Simply type the category name in the input field and add the cost.</li>
          <li>Can I export my data? - Yes, click the export button to download a CSV file.</li>
        </ul>
      </section>

      <button
        onClick={exportCSV}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
      >
        <Download className="mr-2" /> Export as CSV
      </button>
    </div>
  );
};

export default FitnessMembershipCostTracker;


