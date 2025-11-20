import React, { useState } from 'react';

const BudgetCalculator = () => {
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [savings, setSavings] = useState(0);

  const calculateSavings = () => {
    const totalSavings = parseFloat(income || 0) - parseFloat(expenses || 0);
    setSavings(totalSavings > 0 ? totalSavings : 0);
  };

  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
        <input
          type="number"
          placeholder="Enter your income"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Expenses</label>
        <input
          type="number"
          placeholder="Enter your expenses"
          value={expenses}
          onChange={(e) => setExpenses(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>
      <button
        onClick={calculateSavings}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Calculate Savings
      </button>
      {savings > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Your Savings</h2>
          <p className="text-lg text-green-600">${savings.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default BudgetCalculator;