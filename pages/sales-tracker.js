import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Save, X, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import RequireSubscription from '../components/Misc/RequireSubscription';

const SalesTracker = () => {
  const [sales, setSales] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newSale, setNewSale] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    category: 'product',
  });
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // --- AUTH: Get user session and handle changes ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user ?? null;
      if (!mounted) return;
      setUser(u);
    })();

    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      try {
        sub?.subscription?.unsubscribe();
      } catch (e) {}
    };
  }, []);

  // --- Fetch sales when user is available ---
  useEffect(() => {
    if (user) fetchSales();
  }, [user]);

  useEffect(() => {
    calculateTotalSales();
  }, [sales]);

  // --- Fetch only logged-in user's sales ---
  const fetchSales = async () => {
    try {
      const query = supabase.from('sales').select('*').order('date', { ascending: false });
      const q = user ? query.eq('user_id', user.id) : query.limit(0);
      const { data, error } = await q;

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error fetching sales:', err.message);
    }
  };

  // --- Add new sale ---
  const addSale = async () => {
    if (!newSale.description || !newSale.amount) return;

    const sale = {
      ...newSale,
      amount: parseFloat(newSale.amount),
      user_id: user?.id || null, // associate to current user
    };

    try {
      const { data, error } = await supabase.from('sales').insert([sale]).select().single();
      if (error) throw error;

      setSales((prev) => [data, ...prev]);
      setShowAddForm(false);
      setNewSale({
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        category: 'product',
      });
    } catch (err) {
      console.error('Error adding sale:', err.message);
    }
  };

  // --- Edit sale ---
  const handleEdit = (sale) => {
    setEditingId(sale.id);
    setEditData({ ...sale });
  };

  // --- Save updated sale ---
  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('sales')
        .update(editData)
        .eq('id', editingId)
        .eq('user_id', user?.id); // scope to current user

      if (error) throw error;

      setSales((prev) =>
        prev.map((sale) => (sale.id === editingId ? { ...sale, ...editData } : sale))
      );
      setEditingId(null);
      setEditData({});
    } catch (err) {
      console.error('Error saving sale:', err.message);
    }
  };

  // --- Delete sale ---
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('sales').delete().eq('id', id).eq('user_id', user?.id);
      if (error) throw error;

      setSales((prev) => prev.filter((sale) => sale.id !== id));
    } catch (err) {
      console.error('Error deleting sale:', err.message);
    }
  };

  // --- Calculate total ---
  const calculateTotalSales = () => {
    const total = sales.reduce((acc, sale) => acc + parseFloat(sale.amount || 0), 0);
    setTotalSales(total);
  };

  // --- Filter sales by search and date range ---
  const filterSales = () => {
    let filteredSales = [...sales];

    if (searchTerm) {
      filteredSales = filteredSales.filter((sale) =>
        sale.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPeriod === 'custom' && customStartDate && customEndDate) {
      filteredSales = filteredSales.filter(
        (sale) =>
          new Date(sale.date) >= new Date(customStartDate) &&
          new Date(sale.date) <= new Date(customEndDate)
      );
    }

    return filteredSales;
  };

  // --- Render a row ---
  const renderTableRow = (sale) => {
    const isEditing = editingId === sale.id;

    if (isEditing) {
      return (
        <tr key={sale.id}>
          <td className="px-4 py-2">
            <input
              type="date"
              value={editData.date}
              onChange={(e) => setEditData((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full border rounded px-2 py-1"
            />
          </td>
          <td className="px-4 py-2">
            <input
              type="text"
              value={editData.description}
              onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full border rounded px-2 py-1"
            />
          </td>
          <td className="px-4 py-2">
            <select
              value={editData.category}
              onChange={(e) => setEditData((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full border rounded px-2 py-1"
            >
              <option value="product">Product</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </td>
          <td className="px-4 py-2">
            <input
              type="number"
              value={editData.amount}
              onChange={(e) => setEditData((prev) => ({ ...prev, amount: parseFloat(e.target.value) }))}
              className="w-full border rounded px-2 py-1"
              step="0.01"
            />
          </td>
          <td className="px-4 py-2 text-right">
            <div className="flex justify-end gap-2">
              <button onClick={handleSave} className="text-green-600 hover:text-green-900">
                <Save className="h-5 w-5" />
              </button>
              <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={sale.id}>
        <td className="px-4 py-2">{format(new Date(sale.date), 'MMM d, yyyy')}</td>
        <td className="px-4 py-2">{sale.description}</td>
        <td className="px-4 py-2">{sale.category}</td>
        <td className="px-4 py-2">${sale.amount.toFixed(2)}</td>
        <td className="px-4 py-2 text-right">
          <div className="flex justify-end gap-2">
            <button onClick={() => handleEdit(sale)} className="text-blue-600 hover:text-blue-900">
              <Edit2 className="h-5 w-5" />
            </button>
            <button onClick={() => handleDelete(sale.id)} className="text-red-600 hover:text-red-900">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // --- Main Render ---
  return (
    <RequireSubscription>
      <div className="w-full min-h-screen">
        <div className="w-full container mx-auto max-w-screen-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Sales Tracker</h1>
          <p className="text-lg text-gray-700 mb-6 text-center">
            Track your sales, analyze trends, and manage your business effectively.
          </p>
          <div className="bg-gray-100 p-6 rounded-lg">
            <div className="mb-6 flex justify-between flex-wrap items-center">
              <h2 className="text-xl font-semibold">Total Sales: ${totalSales.toFixed(2)}</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center bg-green-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition duration-200"
              >
                <PlusCircle className="w-6 h-6 mr-2" />
                <span className="text-sm font-medium">Add Sale</span>
              </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-4">
              <input
                type="text"
                placeholder="Search by description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Date Range Filter */}
            {filterPeriod === 'custom' && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            )}

            {/* Add Sale Form */}
            {showAddForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">Add New Sale</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={newSale.date}
                    onChange={(e) => setNewSale((prev) => ({ ...prev, date: e.target.value }))}
                    className="border rounded-lg px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newSale.description}
                    onChange={(e) => setNewSale((prev) => ({ ...prev, description: e.target.value }))}
                    className="border rounded-lg px-3 py-2"
                  />
                  <select
                    value={newSale.category}
                    onChange={(e) => setNewSale((prev) => ({ ...prev, category: e.target.value }))}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newSale.amount}
                    onChange={(e) => setNewSale((prev) => ({ ...prev, amount: e.target.value }))}
                    step="0.01"
                    className="border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addSale}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Sales Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 bg-gray-50 p-6 rounded-lg shadow-md">
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterSales().map(renderTableRow)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </RequireSubscription>
  );
};

export default SalesTracker;
