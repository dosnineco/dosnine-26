import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import { Save, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/router';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import Head from 'next/head';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Settings = () => {
  const { user } = useUser();
  const router = useRouter();
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [categoryLimits, setCategoryLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [totalCategoryLimits, setTotalCategoryLimits] = useState(0);
  const [currentMonthSpending, setCurrentMonthSpending] = useState(0);
  const [previousMonthSpending, setPreviousMonthSpending] = useState(0);
  const [monthlySpendingData, setMonthlySpendingData] = useState([]);
  
  const categories = [
    'food',
    'shopping',
    'transport',
    'housing',
    'entertainment',
    'healthcare',
    'investments',
  ];

  // Helper function to get current month string in consistent format: YYYY-MM-01
  const getCurrentMonthString = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  };

  // Fetch budget settings with fallback to default (month = null)
  const fetchBudgetSettings = async () => {
    try {
      // Try to get budget for current month
      const monthString = getCurrentMonthString();

      let { data: budgetData, error: budgetError } = await supabase
        .from('monthly_budgets')
        .select('amount')
        .eq('user_id', user.id)
        .eq('month', monthString)
        .single();

      if (budgetError && budgetError.code !== 'PGRST116') {
        // Ignore 'no rows' error; otherwise log
        throw budgetError;
      }

      // If no budget for current month, try to get default budget (month = null)
      if (!budgetData) {
        const { data: defaultBudgetData, error: defaultError } = await supabase
          .from('monthly_budgets')
          .select('amount')
          .eq('user_id', user.id)
          .is('month', null)
          .single();

        if (defaultError && defaultError.code !== 'PGRST116') {
          throw defaultError;
        }

        if (defaultBudgetData) {
          setMonthlyBudget(defaultBudgetData.amount.toString());
        } else {
          setMonthlyBudget(''); // No budget set
        }
      } else {
        setMonthlyBudget(budgetData.amount.toString());
      }

      // Fetch category limits (no month restriction)
      const { data: limitsData, error: limitsError } = await supabase
        .from('category_limits')
        .select('category, limit_amount')
        .eq('user_id', user.id);

      if (limitsError) throw limitsError;

      const limits = {};
      limitsData?.forEach((limit) => {
        limits[limit.category] = limit.limit_amount.toString();
      });

      setCategoryLimits(limits);
    } catch (err) {
      console.error('Failed to load budget settings:', err);
      setError('Failed to load budget settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpendingData = async () => {
    try {
      const currentMonth = getCurrentMonthString();
      const prevMonthDate = new Date();
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const previousMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

      // Fetch current month spending
      const { data: currentData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('transaction_date', currentMonth);

      const currentTotal =
        currentData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

      // Fetch previous month spending
      const { data: previousData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('transaction_date', previousMonth)
        .lt('transaction_date', currentMonth);

      const previousTotal =
        previousData?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

      setCurrentMonthSpending(currentTotal);
      setPreviousMonthSpending(previousTotal);
    } catch (err) {
      console.error('Failed to fetch spending data:', err);
    }
  };

  const fetchMonthlySpendingData = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date, amount')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      if (data && data.length > 0) {
        // Aggregate spending by month YYYY-MM
        const spendingByMonth = data.reduce((acc, transaction) => {
          const month = new Date(transaction.transaction_date).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + parseFloat(transaction.amount);
          return acc;
        }, {});
        // Format data for graph and sort by month ascending
        const formattedData = Object.entries(spendingByMonth).map(([month, total]) => ({
          month,
          total,
        }));
        formattedData.sort((a, b) => new Date(a.month) - new Date(b.month));
        setMonthlySpendingData(formattedData);
      } else {
        setMonthlySpendingData([]);
      }
    } catch (err) {
      console.error('Failed to fetch monthly spending data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBudgetSettings();
      fetchSpendingData();
      fetchMonthlySpendingData();
    }
  }, [user]);

  useEffect(() => {
    // Calculate total category limits
    const total = Object.values(categoryLimits).reduce(
      (sum, value) => sum + (parseFloat(value) || 0),
      0
    );
    setTotalCategoryLimits(total);
  }, [categoryLimits]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const monthString = getCurrentMonthString();

      // Upsert monthly budget for current month and default month (null)
      if (monthlyBudget.trim() === '') {
        // If budget input is empty, delete current month budget (optional)
        await supabase
          .from('monthly_budgets')
          .delete()
          .match({ user_id: user.id, month: monthString });
      } else {
        // Save for current month
        await supabase
          .from('monthly_budgets')
          .upsert(
            [
              {
                user_id: user.id,
                month: monthString,
                amount: parseFloat(monthlyBudget) || 0,
              },
            ],
            { onConflict: ['user_id', 'month'] }
          );
      }

      // Save category limits - no month specific
      const updates = [];
      Object.entries(categoryLimits).forEach(([category, amount]) => {
        if (amount) {
          updates.push({
            user_id: user.id,
            category,
            limit_amount: parseFloat(amount) || 0,
          });
        }
      });

      if (updates.length > 0) {
        await supabase
          .from('category_limits')
          .upsert(updates, { onConflict: ['user_id', 'category'] });
      }

      setSuccess('Settings saved successfully!');
    } catch (err) {
      console.error('Save Error:', err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <AiOutlineLoading3Quarters className="animate-spin text-4xl text-blue-500" />
          <p className="mt-4 text-lg text-gray-600">Loading, please wait...</p>
        </div>
      </div>
    );
  }

  // You might re-enable the graph section when needed by uncommenting it.
  return (
    <>
      <Head>
        <title>Budget Settings</title>
        <meta
          name="description"
          content="Manage your monthly budget and category limits."
        />
        <meta name="keywords" content="budget, settings, finance, categories" />
      </Head>
      <div className="max-w-screen-md mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">
          Budget Settings
        </h1>
        <button
          className="bg-gray-500 text-white p-2 rounded-lg mb-6 flex items-center"
          onClick={() => router.push('/expense-tracker')}
        >
          ← Back
        </button>

        {/* Uncomment to enable graph */}
        {/*
        <div className="mt-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">
            Spending Over Time
          </h2>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            {monthlySpendingData.length > 0 ? (
              <div className="h-64 sm:h-80">
                <Line data={graphData} options={graphOptions} />
              </div>
            ) : (
              <p className="text-gray-600">No spending data available.</p>
            )}
          </div>
        </div>
        */}

        <div className="bg-white p-4 sm:p-6 mt-8 rounded-lg shadow">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">
            Monthly Budget
          </h2>
          <p className="text-sm sm:text-base text-gray-700 mb-4">
            Your monthly budget will persist for every month until you change it.
          </p>
          <input
            type="number"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your monthly budget"
            step="0.01"
          />
        </div>

        <div className="bg-white p-4 sm:p-6 mt-6 rounded-lg shadow">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">
            Category Limits
          </h2>
          <p className="text-sm sm:text-base text-gray-700 mb-4">
            Set limits for each category to better manage your spending.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category}>
                <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                  {category.replace('_', ' ')}
                </label>
                <input
                  type="number"
                  value={categoryLimits[category] || ''}
                  onChange={(e) =>
                    setCategoryLimits((prev) => ({
                      ...prev,
                      [category]: e.target.value,
                    }))
                  }
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter limit"
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  );
};

export default Settings;
