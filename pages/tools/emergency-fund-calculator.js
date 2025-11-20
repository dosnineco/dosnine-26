import React, { useState } from 'react';
import Head from 'next/head';
import SignUpBanner from "../../components/Misc/SignUpBanner";


const EmergencyFundCalculator = () => {
  const [expenses, setExpenses] = useState({
    rent: '',
    utilities: '',
    groceries: '',
    transportation: '',
    entertainment: '',
    other: '',
  });

  const [months, setMonths] = useState('');
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [emergencyFund, setEmergencyFund] = useState(0);

  const handleInputChange = (field, value) => {
    setExpenses((prev) => ({
      ...prev,
      [field]: value ? parseFloat(value) : '',
    }));
  };

  const calculateEmergencyFund = () => {
    const total = Object.values(expenses).reduce((acc, curr) => acc + (curr || 0), 0);
    setTotalExpenses(total);
    setEmergencyFund(total * (months || 0));
  };

  return (
    <>
      <Head>
        <title>Emergency Fund Calculator | Expense Goose</title>
        <meta
          name="description"
          content="Use our Emergency Fund Calculator to estimate how much you need to save for unexpected expenses based on your monthly living costs."
        />
        <meta name="keywords" content="Emergency Fund Calculator, financial tools, expense tracking, savings calculator" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://expensegoose.com/tools/emergency-fund-calculator" />
        {/* JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Emergency Fund Calculator",
              "description":
                "Use our Emergency Fund Calculator to estimate how much you need to save for unexpected expenses based on your monthly living costs.",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "url": "https://expensegoose.com/tools/emergency-fund-calculator",
            }),
          }}
        />
      </Head>
      <div className="min-h-screen p-4 sm:p-6">
        <div className="container mx-auto max-w-screen-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Emergency Fund Calculator</h1>
          <p className="text-lg text-gray-700 mb-6 text-center">
            Estimate how much you need to save for unexpected expenses based on your monthly living costs.
          </p>

          <SignUpBanner/>
          <div className="bg-gray-100 p-6 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rent</label>
                <input
                  type="number"
                  placeholder="Enter rent amount"
                  value={expenses.rent}
                  onChange={(e) => handleInputChange('rent', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utilities</label>
                <input
                  type="number"
                  placeholder="Enter utilities amount"
                  value={expenses.utilities}
                  onChange={(e) => handleInputChange('utilities', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Groceries</label>
                <input
                  type="number"
                  placeholder="Enter groceries amount"
                  value={expenses.groceries}
                  onChange={(e) => handleInputChange('groceries', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportation</label>
                <input
                  type="number"
                  placeholder="Enter transportation amount"
                  value={expenses.transportation}
                  onChange={(e) => handleInputChange('transportation', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entertainment</label>
                <input
                  type="number"
                  placeholder="Enter entertainment amount"
                  value={expenses.entertainment}
                  onChange={(e) => handleInputChange('entertainment', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other</label>
                <input
                  type="number"
                  placeholder="Enter other expenses"
                  value={expenses.other}
                  onChange={(e) => handleInputChange('other', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Months to Cover</label>
              <input
                type="number"
                placeholder="Enter the number of months"
                value={months}
                onChange={(e) => setMonths(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={calculateEmergencyFund}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition duration-200"
              >
                Calculate Emergency Fund
              </button>
            </div>
            {totalExpenses > 0 && (
              <div className="mt-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">Total Monthly Expenses</h2>
                <p className="text-xl text-gray-700 mt-2">${totalExpenses.toFixed(2)}</p>
                <h2 className="text-2xl font-bold text-gray-900 mt-4">Recommended Emergency Fund</h2>
                <p className="text-xl text-green-600 mt-2">${emergencyFund.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmergencyFundCalculator;