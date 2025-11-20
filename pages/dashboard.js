import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Settings,  PlusCircle,FilePlus ,Edit2, Trash2, Save, X, Plus, Search, Filter, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FaUtensils, FaShoppingCart, FaCar, FaHome, FaGamepad } from 'react-icons/fa';
import { useRouter } from "next/router";
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { TiRefresh } from "react-icons/ti";
import { DollarSign } from "lucide-react";
import RequireSubscription from '../components/Misc/RequireSubscription';  
import { MdTune,MdFileDownload } from "react-icons/md";

import { CSVLink } from 'react-csv'; 
import { FaInfoCircle } from 'react-icons/fa';

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

const HowToUseModal = ({ isOpen, onClose }) => {
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const App = () => {
  const router = useRouter();
  const { user } = useUser();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalCredits: 0, totalDebits: 0, netBalance: 0 });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
const [monthlySpendingData, setMonthlySpendingData] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMonthlySpendingData();
    }
  }, [user]);

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
      // Aggregate spending by month
      const spendingByMonth = data.reduce((acc, transaction) => {
        const month = new Date(transaction.transaction_date).toISOString().slice(0, 7); // Format: YYYY-MM
        acc[month] = (acc[month] || 0) + parseFloat(transaction.amount);
        return acc;
      }, {});

      // Format data for the graph
      const formattedData = Object.entries(spendingByMonth).map(([month, total]) => ({
        month,
        total,
      }));

      // Sort by month
      formattedData.sort((a, b) => new Date(a.month) - new Date(b.month));

      setMonthlySpendingData(formattedData);
    } else {
      setMonthlySpendingData([]); // Set an empty array if no data is returned
    }
  } catch (err) {
    console.error('Failed to fetch monthly spending data:', err);
  }
};


 const formatMoney = (amount) => {
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
  };

const graphDataload = {
  labels: monthlySpendingData.map((item) => item.month),
  datasets: [
    {
      label: "Spending",
      data: monthlySpendingData.map((item) => item.total),
      borderColor: "#16a34a", // Primary green line
      backgroundColor: "rgba(34, 197, 94, 0.15)", // Soft green fill
      pointBackgroundColor: "#22c55e", // Bright green points
      pointBorderColor: "#22c55e",
      pointHoverBackgroundColor: "#22c55e", // Teal hover color
      pointHoverBorderColor: "#22c55e",
      pointRadius: 7, // Slightly smaller but visible
      pointHoverRadius: 14, // Hover effect
      borderWidth: 2, // Thicker line for emphasis
      tension: 0.35, // Smooth curve
    },
  ],
};

const formatMoneyShort = (num) => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toFixed(0);
};

const graphOptions = {
  responsive: true,
  maintainAspectRatio: true, // Allow the graph to resize dynamically
  plugins: {
    legend: {
      display: true, // Hide the legend
      
    },
    tooltip: {
      backgroundColor: '#1F2937', // Dark background for the tooltip
      titleColor: '#FFFFFF', // White title text
      bodyColor: '#FFFFFF', // White body text
      borderColor: '#FBBF24', // Gold border
      borderWidth: 1,
      cornerRadius: 4,
      callbacks: {
        title: (tooltipItems) => {
          const month = tooltipItems[0].label;
          return `${month}`; // Display the month
        },
        label: (context) => `$${context.raw.toFixed(2)}`, // Display the amount
     
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: true, // Hide gridlines on the x-axis

      },
      ticks: {
        color: '#6B7280', // Gray color for x-axis labels

        font: {
          size: 12,
        },
      },
    },
    y: {
      grid: {
        color: '#E5E7EB', // Light gray gridlines
        drawBorder: false, // Hide the border
      },
      ticks: {
        color: '#6B7280', // Gray color for y-axis labels
        font: {
          size: 12,
        },
        callback: (value) => `$${formatMoneyShort(value)}`, // Use compact money format
      },
    },
  },
};

  // Function to handle category click
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowPopup(true);
  };

  // Function to close the popup
  const closePopup = () => {
    setSelectedCategory(null);
    setShowPopup(false);
  };

  // Filter transactions by the selected category
  const filteredTransactions = transactions.filter(
    (transaction) => transaction.category === selectedCategory
  );

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState('');
const [customEndDate, setCustomEndDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    post_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    category: 'other',
  });

  const [monthlySpending, setMonthlySpending] = useState(0);
  const [weeklyBudget, setWeeklyBudget] = useState(() => JSON.parse(localStorage.getItem('weeklyBudget')) || 10000);
  const [categoryLimits, setCategoryLimits] = useState(() => JSON.parse(localStorage.getItem('categoryLimits')) || []);
  const [spendingInsights, setSpendingInsights] = useState([]);

  const [savingsProgress, setSavingsProgress] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(0); // Savings goal from category limits
  const [savingsTotal, setSavingsTotal] = useState(0); // Total savings so far
const getPeriodBudget = () => {
  // Default to month if not recognized
  switch (filterPeriod) {
    case 'day':
      return weeklyBudget / 7;
    case 'week':
      return weeklyBudget;
    case 'month':
      return weeklyBudget * 4;
    case 'year':
      return weeklyBudget * 52;
    case 'custom range':
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        return (weeklyBudget / 7) * days;
      }
      return 0;
    default:
      return weeklyBudget * 4;
  }
};

const periodBudget = getPeriodBudget();
const remainingBudget = periodBudget - monthlySpending;


  useEffect(() => {
    if (!user) return;
    fetchBudgetAndCategoryLimits().then(() => fetchTransactions());
  }, [user]);
  
  // Prepare data for the graph based on the selected filter
const graphData = useMemo(() => {
  const groupedData = {};

  transactions.forEach((transaction) => {
    const dateKey = format(new Date(transaction.transaction_date), filterPeriod === 'day' ? 'yyyy-MM-dd' :
      filterPeriod === 'week' ? 'yyyy-ww' : 'yyyy-MM');
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = 0;
    }
    groupedData[dateKey] += Math.abs(transaction.amount);
  });

  return Object.entries(groupedData).map(([key, value]) => ({
    date: key,
    spending: value,
  }));
}, [transactions, filterPeriod]);

// CSV headers for download
const csvHeaders = [
  { label: 'Date', key: 'transaction_date' },
  { label: 'Description', key: 'description' },
  { label: 'Category', key: 'category' },
  { label: 'Amount', key: 'amount' },
];

  // Memoized filter function
  const filterTransactions = useCallback((data) => {
    return data.filter((t) => {
      const matchesSearch = searchTerm
        ? t.description.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
  
      let matchesFilter = true;
      const date = parseISO(t.transaction_date);
  
      if (filterPeriod === 'day') {
        matchesFilter = date >= subDays(new Date(), 1);
      } else if (filterPeriod === 'week') {
        matchesFilter = date >= startOfWeek(new Date()) && date <= endOfWeek(new Date());
      } else if (filterPeriod === 'month') {
        matchesFilter = date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
      } else if (filterPeriod === 'year') {
        matchesFilter = date.getFullYear() === parseInt(selectedYear, 10);
      } else if (filterPeriod === 'custom range') {
        matchesFilter =
          date >= new Date(customStartDate) && date <= new Date(customEndDate);
      }
  
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filterPeriod, selectedYear, customStartDate, customEndDate]);


  const fetchBudgetAndCategoryLimits = async () => {
    if (!user) return;
    try {
      const [{ data: budgetData, error: budgetError }, { data: categoryLimitsData, error: categoryLimitsError }] = await Promise.all([
        supabase.from('monthly_budgets').select('amount').eq('user_id', user.id).eq('month', format(new Date(), 'yyyy-MM-01')),
        supabase.from('category_limits').select('*').eq('user_id', user.id)
      ]);
      
      if (budgetError) throw budgetError;
      if (categoryLimitsError) throw categoryLimitsError;
      
      const budget = budgetData.length ? budgetData[0].amount / 4 : 0;
      setWeeklyBudget(budget);
      localStorage.setItem('weeklyBudget', JSON.stringify(budget));
      
      setCategoryLimits(categoryLimitsData || []);
      localStorage.setItem('categoryLimits', JSON.stringify(categoryLimitsData || []));
    } catch (err) {
      setError(err.message || 'Error fetching budget data');
    }
  };
  

  const analyzeSpending = useCallback((data) => {
    if (!Array.isArray(data) || data.length === 0) return [];
  
    const categoryTotals = new Map();
    let savingsTotal = 0;
  
    for (const { category, amount } of data) {
      if (category === 'savings') {
        savingsTotal += Math.abs(amount); // Track savings separately
      } else {
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(amount));
      }
    }
  
    // Calculate savings progress
    const savingsLimit = categoryLimits.find((limit) => limit.category === 'savings')?.limit_amount || 0;
    setSavingsGoal(savingsLimit);
    setSavingsTotal(savingsTotal);
    setSavingsProgress((savingsTotal / savingsLimit) * 100);
  
    const categoryLimitMap = new Map(categoryLimits.map(({ category, limit_amount }) => [category, limit_amount]));
  
    const insights = Array.from(categoryTotals.entries()).map(([category, total]) => {
      const categoryLimit = categoryLimitMap.get(category) ?? (weeklyBudget * 4) * 0.2;
      const isOverBudget = total > categoryLimit;
  
      let recommendation = isOverBudget
        ? 'You\'ve exceeded your budget'
        : 'You are within budget.';
  
      return {
        category,
        total,
        trend: isOverBudget ? 'up' : 'down',
        recommendation,
      };
    });
  
    return insights.sort((a, b) => b.total - a.total);
  }, [weeklyBudget, categoryLimits]);

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditData({ ...transaction });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: field === 'amount' ? parseFloat(value) : value
    }));
  };

const HowToUseModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded bg-gray-200 text-gray-400 hover:text-gray-700 text-xl"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800">How to Use the Expense Tracker</h2>
        <ol className="list-decimal pl-5 text-gray-700 text-base space-y-2">
          <li>Click settings at the top - set your category limits.</li>
          <li>Add your expenses using the "Add Transaction" button.</li>
          <li>Edit or delete transactions as needed.</li>
          <li>Use filters and search to find past expenses.</li>
          <li>Visualize your spending with the chart.</li>
          <li>Download your data as CSV for offline use.</li>
        </ol>
      <p className="mt-4 text-gray-600 text-sm text-center">
          Need more help?{" "}
          <a
            href="mailto:dosnineco@gmail.com"
            className="text-blue-600 underline"
          >
            Email us at dosnineco@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

  const fetchTransactions = async () => {
    if (!user) return;
  
    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });
  
      if (fetchError) throw fetchError;
  
      const filteredData = filterTransactions(data || []);
      setTransactions(filteredData);
  
      // Exclude savings from summary and monthly spending calculations
      const nonSavingsTransactions = filteredData.filter(
        (transaction) => transaction.category !== 'savings'
      );
  
      const summary = nonSavingsTransactions.reduce(
        (acc, curr) => {
          if (curr.amount >= 0) {
            acc.totalCredits += curr.amount;
          } else {
            acc.totalDebits += Math.abs(curr.amount);
          }
          return acc;
        },
        { totalCredits: 0, totalDebits: 0, netBalance: 0 }
      );
  
      summary.netBalance = summary.totalCredits - summary.totalDebits;
      setSummary(summary);
  
      const monthlyTotal = nonSavingsTransactions.reduce(
        (acc, curr) => acc + Math.abs(curr.amount),
        0
      );
      setMonthlySpending(monthlyTotal);
  
      const insights = analyzeSpending(filteredData);
      setSpendingInsights(insights);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Optimized add transaction with local state update
  const addTransaction = async () => {
    if (!user || !newTransaction.description || !newTransaction.amount) return;

    try {
      const newTx = {
        user_id: user.id,
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      };

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([newTx])
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setTransactions(prev => [data, ...prev]);
      setShowAddForm(false);
      setNewTransaction({
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        post_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        category: 'other',
      });

      // Recalculate insights
      const updatedTransactions = [data, ...transactions];
      const insights = analyzeSpending(updatedTransactions);
      setSpendingInsights(insights);
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  // Optimized edit with local state update
  const handleSave = async () => {
    if (!editingId || !user) return;

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(editData)
        .eq('id', editingId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setTransactions(prev =>
        prev.map(t => (t.id === editingId ? { ...t, ...editData } : t))
      );
      
      const updatedTransactions = transactions.map(t => 
        t.id === editingId ? { ...t, ...editData } : t
      );
      
      const insights = analyzeSpending(updatedTransactions);
      setSpendingInsights(insights);
      
      setEditingId(null);
      setEditData({});
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  // Optimized delete with local state update
  const handleDelete = async (id) => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Update local state
      const updatedTransactions = transactions.filter(t => t.id !== id);
      setTransactions(updatedTransactions);
      
      const insights = analyzeSpending(updatedTransactions);
      setSpendingInsights(insights);
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };


useEffect(() => {
  if (user) {
    fetchTransactions();
  }
  // eslint-disable-next-line
}, [filterPeriod, selectedYear, customStartDate, customEndDate, user]);


  const getCategoryIcon = (category) => {
    switch (category) {
      case 'food':
        return <FaUtensils className="text-green-500" />;
      case 'shopping':
        return <FaShoppingCart className="text-blue-500" />;
      case 'transport':
        return <FaCar className="text-red-500" />;
      case 'housing':
        return <FaHome className="text-purple-500" />;
      case 'entertainment':
        return <FaGamepad className="text-yellow-500" />;
      case 'investments':
        return <TrendingUp className="text-indigo-500" />;
      case 'savings':
        return <DollarSign className="text-teal-500" />;
      case 'other':
        return <AlertTriangle className="text-gray-500" />;
      default:
        return <FaShoppingCart className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
      <div className="flex flex-col items-center">
        <AiOutlineLoading3Quarters className="animate-spin text-4xl text-blue-500" />
        <p className="mt-4 text-lg text-gray-600">Loading, please wait...</p>
      </div>
    </div>
    );
  }


  const renderTableRow = (transaction) => {
    const isEditing = editingId === transaction.id;

    if (isEditing) {
      return (
        <tr key={transaction.id}>
          <td className="px-4 py-2">
            <input
              type="date"
              value={editData.transaction_date}
              onChange={(e) => handleInputChange('transaction_date', e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </td>
          <td className="px-4 py-2">
            <input
              type="text"
              value={editData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </td>
          <td className="px-4 py-2">
            <select
    value={editData.category}
    onChange={(e) => handleInputChange('category', e.target.value)}
    className="w-full border rounded px-2 py-1"
  >
     <option value="food">Food</option>
            <option value="shopping">Shopping</option>
            <option value="transport">Transport</option>
            <option value="housing">Housing</option>
            <option value="entertainment">Entertainment</option>
            <option value="investments">Investments</option>
          <option value="savings">Savings</option>
            <option value="other">Other</option>
            </select>

          </td>
          <td className="px-4 py-2">
            <input
              type="number"
              value={editData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className="w-full border rounded px-2 py-1"
              step="0.01"
            />
          </td>
          <td className="px-4 py-2 text-right">
            <div className="flex justify-end gap-2">
              <button
                onClick={handleSave}
                className="text-green-600 hover:text-green-900"
              >
                <Save className="h-5 w-5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={transaction.id}>
        <td className="px-4 text-gray-600 text-base py-4 whitespace-nowrap">
          {format(new Date(transaction.transaction_date), "MMM d, yyyy")}
        </td>
        <td className="px-4 text-gray-600 py-4 text-base ">{transaction.description}</td>
        <td className="px-4 py-4 whitespace-nowrap">
          {getCategoryIcon(transaction.category)}
        </td>
        

        <td
          className={`px-4 py-4 whitespace-nowrap ${
            transaction.amount >= 0 ? "text-gray-600" : "text-red-400"
          }`}
        >
          ${formatMoney(Math.abs(transaction.amount))}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleEdit(transaction)}
              className="text-blue-600 hover:text-blue-900"
            >
              <Edit2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelete(transaction.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

 
return (
    <RequireSubscription>
    <div className="min-h-screen flex items-center justify-center   p-4 sm:p-6">
        <div className="w-full max-w-screen-md"> {/* Added container with max width */}
          <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Expense Tracker</h1>
        
        </div>
          <button
            className="text-blue-600 hover:text-blue-800 py-4 flex items-center"
            onClick={() => setIsHowToUseOpen(true)}
          >
            <FaInfoCircle className="mr-2 " />
            How to Use
          </button>

        {/* How to Use Modal */}
        <HowToUseModal
          isOpen={isHowToUseOpen}
          onClose={() => setIsHowToUseOpen(false)}
        />


{/* non */}
      <div className="w-full mx-auto">

{/* filepath: /workspaces/romebybrand/pages/budget-calculator.js */}
<div className="w-full mx-auto mb-6">
  {/* Action Row */}
<div className="flex flex-wrap justify-between items-center bg-gray-100 p-4 rounded-lg shadow gap-4">

    {/* Add Transaction Button */}
    <div className="flex justify-center">
      <button
        onClick={() => setShowAddForm(true)}
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        aria-label="Add New Transaction"
      >
        <PlusCircle className="w-6 h-6 mr-2" />
        <span className="hidden sm:inline text-sm font-medium">Add Transaction</span>
      </button>
{showAddForm && (
  <div className="fixed inset-0  z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
    <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-lg p-6 relative">
      <button
        onClick={() => setShowAddForm(false)}
        className="absolute top-2 right-2 p-2 rounded bg-gray-200 text-gray-400 hover:text-gray-700 text-xl"
        aria-label="Close"
      >
        ✕
      </button>
      <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800">Add New Transaction</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="date"
          value={newTransaction.transaction_date}
          onChange={(e) =>
            setNewTransaction((prev) => ({
              ...prev,
              transaction_date: e.target.value,
            }))
          }
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="date"
          value={newTransaction.post_date}
          onChange={(e) =>
            setNewTransaction((prev) => ({
              ...prev,
              post_date: e.target.value,
            }))
          }
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="text"
          placeholder="Description"
          value={newTransaction.description}
          onChange={(e) =>
            setNewTransaction((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="number"
          placeholder="Amount"
          value={newTransaction.amount}
          onChange={(e) =>
            setNewTransaction((prev) => ({
              ...prev,
              amount: e.target.value,
            }))
          }
          step="0.01"
          className="border rounded-lg px-3 py-2"
        />
        <select
          value={newTransaction.category}
          onChange={(e) =>
            setNewTransaction((prev) => ({
              ...prev,
              category: e.target.value,
            }))
          }
          className="border rounded-lg px-3 py-2"
        >
          <option value="food">Food</option>
          <option value="shopping">Shopping</option>
          <option value="transport">Transport</option>
          <option value="housing">Housing</option>
          <option value="entertainment">Entertainment</option>
          <option value="investments">Investments</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => setShowAddForm(false)}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex-1"
        >
          Cancel
        </button>
        <button
          onClick={addTransaction}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex-1"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
    </div>

    {/* Quick Expenses */}
    <button
      className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
      onClick={() => router.push('/quick')}
    >
      <MdTune className="w-6 h-6 text-blue-500" />
      <span className="hidden sm:inline text-sm font-medium">Presets</span>
    </button>

    {/* Settings */}
    <button
      className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
      onClick={() => router.push('/settings')}
    >
      <Settings className="w-6 h-6 text-green-500" />
      <span className="hidden sm:inline text-sm font-medium">Settings</span>
    </button>

    {/* Download Transactions */}
    <CSVLink

      data={transactions}
      headers={csvHeaders}
      filename={`expensegoose_transactions-${filterPeriod}.csv`}
      className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
    >
      <MdFileDownload className="w-6 h-6 text-purple-500"/>
      <span className="hidden sm:inline text-sm font-medium">Download</span>
    </CSVLink>

    {/* Filter Dropdown */}
    <div className="relative">
      <button
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
      >
        <Filter className="w-6 h-6 text-orange-500" />
        <span className="hidden sm:inline text-sm font-medium">Filter</span>
      </button>
      {showFilterDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <ul className="py-2">
            <li>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setFilterPeriod('all');
                  setShowFilterDropdown(false);
                }}
              >
                All Time
              </button>
            </li>
            <li>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setFilterPeriod('day');
                  setShowFilterDropdown(false);
                }}
              >
                Last 24 Hours
              </button>
            </li>
            <li>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setFilterPeriod('week');
                  setShowFilterDropdown(false);
                }}
              >
                This Week
              </button>
            </li>
            <li>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setFilterPeriod('month');
                  setShowFilterDropdown(false);
                }}
              >
                This Month
              </button>
            </li>
            <li>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setFilterPeriod('year');
                  setShowFilterDropdown(false);
                }}
              >
                This Year
              </button>
            </li>
            <li>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setFilterPeriod('custom range');
                  setShowFilterDropdown(false);
                }}
              >
                Custom Range
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>

    {/* Apply Changes */}
    <button
      className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
      onClick={() => fetchTransactions()}
    >
      <TiRefresh className="w-6 h-6 text-orange-500" />
      <span className="hidden sm:inline text-sm font-medium">Apply Changes</span>
    </button>
  </div>

  {/* search Section */}
  <div className="bg-gray-50 rounded-lg p-4 mt-4">
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search Input */}
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {/* Filter Period */}
    
    </div>

    {/* Conditional Form for Custom Range or Year */}
    {(filterPeriod === 'custom range' || filterPeriod === 'year') && (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filterPeriod === 'custom range' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </>
        )}
        {filterPeriod === 'year' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    )}
  </div>
</div>

      <div className="mt-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Spending Over Time</h2>
        <div className=" p-2 sm:p-4 rounded-lg">
          {monthlySpendingData.length > 0 ? (
            <div className="h-full w-full">
              <Line data={graphDataload} options={graphOptions} />
            </div>
          ) : (
            <p className="text-gray-600">No spending data available.</p>
          )}
        </div>
      </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
  {/* Monthly Spending */}
        <div className="p-6 bg-gray-100 rounded-lg  text-gray-900 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-lg font-semibold tracking-wide">Monthly Spending</label>
          </div>
          <input
            type="text"
            value={`$${formatMoney(monthlySpending)}`}
            readOnly
            className="w-full text-2xl font-bold bg-transparent text-center outline-none tracking-wide"
          />
          <p className="mt-2 text-sm text-gray-600">Stay in control of your expenses.</p>
        </div>

  {/* Remaining Budget */}
  {/* <div className="p-6 bg-gray-100 rounded-lg text-gray-900 flex flex-col items-center text-center">
  <div className="flex items-center gap-2 mb-2">
    <label className="text-lg font-semibold tracking-wide">Remaining Budget</label>
  </div>
  <input
    type="text"
    value={`$${formatMoney(remainingBudget)}`}
    readOnly
    className="w-full text-2xl font-bold bg-transparent text-center outline-none tracking-wide"
  />
  {monthlySpending > periodBudget && (
    <p className="text-red-600 text-sm mt-2">You’ve exceeded your budget!</p>
  )}
</div> */}
</div>

    <div className="mt-4 mb-5 grid  sm:grid-cols-1 md:grid-cols-3  gap-4">


        

  


        {spendingInsights.map((insight) => (
          <div
            key={insight.category}
            className={`p-4 flex items-center col-span-1 rounded-lg justify-center flex-col h-24  text-center ${
              insight.trend === "up" ? "border-orange-900 bg-orange-200" : "border-green-900 bg-green-200"
            } `}
            onClick={() => handleCategoryClick(insight.category)}
            aria-label={`View transactions for ${insight.category}`}
          >
            <div className="flex justify-between items-center  w-full mb-1">
              <h3 className="text-sm mt-1 font-semibold text-center text-gray-900 capitalize">{insight.category}</h3>
              {insight.trend === "up" ? (
                <AlertTriangle className=" text-sm mt-1 h-4 w-4 text-red-900" />
              ) : (
                <TrendingUp className="text-sm mt-1 text-sm mt-1 h-4 w-4 text-green-900" />
              )}
            </div>

            <p className="text-lg p-0 m-0  flex items-center justify-center font-bold text-center text-gray-900">${formatMoney(insight.total)}</p>
          <p className="text-xs text-gray-700">{insight.recommendation}</p>
          </div>
        ))}

{/* Popup */}
{showPopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
    <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-lg p-6 relative overflow-y-auto max-h-[80vh]">
      
      {/* Close Button */}
      <button
        onClick={closePopup}
        className="absolute top-2 right-2 p-2 rounded bg-gray-200 text-gray-400 hover:text-gray-700 text-xl"
        aria-label="Close"
      >
        ✕
      </button>

      <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800 capitalize">
        Transactions for {selectedCategory}
      </h2>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          <ol className="list-decimal pl-5 text-gray-700 text-sm md:text-base">
            {filteredTransactions.map((transaction) => (
              <li key={transaction.id}>
                <span className="font-medium">{transaction.description}</span>{" "}
                - {format(new Date(transaction.transaction_date), "MMM d, yyyy")} -{" "}
                <span className="font-bold text-gray-900">
                  ${formatMoney(transaction.amount)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-center text-gray-500">
            No transactions found for this category.
          </p>
        )}
      </div>
    </div>
  </div>
)}

     
            

</div>




        {/* Transactions Table */}
        <div className=" rounded-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200  p-6 rounded-lg ">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className=" bg-white divide-y divide-gray-200">
                  {transactions.map(renderTableRow)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Table (Card Layout) */}
          <div className="sm:hidden">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white border-b border-gray-200 p-4"
              >
                {editingId === transaction.id ? (
                  <div className="space-y-3">
                    <div>
                      <input
                        type="date"
                        value={editData.transaction_date}
                        onChange={(e) => handleInputChange('transaction_date', e.target.value)}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <select
                        value={editData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full border rounded px-2 py-1"
                      >
                            <option value="food">Food</option>
                        <option value="shopping">Shopping</option>
                        <option value="transport">Transport</option>
                        <option value="housing">Housing</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="investments">Investments</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        value={editData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        step="0.01"
                      />
                    </div>
                    <div className=" flex justify-end gap-2">
                      <button
                        onClick={handleSave}
                        className="m-2 p-2 bg-gray-50 rounded text-green-600 hover:text-green-900"
                      >
                        <Save className="h-7 w-7" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="m-2 p-2 bg-gray-50 rounded text-gray-600 hover:text-gray-900"
                      >
                        <X className="h-7 w-7" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(transaction.transaction_date), "MMM d, yyyy")}
                    </div>
                    <div
                      className={`text-sm ${
                        transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                
                  <div className="mt-2 text-sm text-gray-500">
                    {transaction.description}
                  </div>
                
                  <div className="mt-2 flex items-center gap-2">
                    {getCategoryIcon(transaction.category)}
                    <span className="text-sm text-gray-700">
                      {transaction.category}
                    </span>
                  </div>
                
                  <div className="mt-2 flex justify-end space-x-4">

                  <button
                      onClick={() => handleDelete(transaction.id)}
                      className="p-2 bg-gray-50 rounded text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-7 w-7" />
                    </button> 
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="p-2 bg-gray-50 rounded text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 className="h-7 w-7" />
                    </button>
                   
                  </div>
                </>
                
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
    </RequireSubscription>
  );
};

export default App;