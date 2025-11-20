import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { PlusCircle, Save, Trash2, Edit2, X } from 'lucide-react';
import RequiredSubscription from '../components/Misc/RequireSubscription';

const SavingMoneyCalculator = () => {
  const { user } = useUser();
  const [goals, setGoals] = useState([]);
  const [payments, setPayments] = useState({});
  const [newGoal, setNewGoal] = useState({ goal_name: '', target_amount: '', monthly_contribution: '' });
  const [newPayment, setNewPayment] = useState({ goal_id: '', amount: '' });
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchPayments();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('saving_money_calculations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_payments')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const paymentsByGoal = data.reduce((acc, payment) => {
        acc[payment.goal_id] = acc[payment.goal_id] || [];
        acc[payment.goal_id].push(payment);
        return acc;
      }, {});
      setPayments(paymentsByGoal);
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  const addGoal = async () => {
    if (!user || !newGoal.goal_name || !newGoal.target_amount || !newGoal.monthly_contribution) return;

    try {
      const goal = {
        user_id: user.id,
        ...newGoal,
        target_amount: parseFloat(newGoal.target_amount),
        monthly_contribution: parseFloat(newGoal.monthly_contribution),
      };

      const { data, error } = await supabase
        .from('saving_money_calculations')
        .insert([goal])
        .select()
        .single();

      if (error) throw error;

      setGoals((prev) => [data, ...prev]);
      setNewGoal({ goal_name: '', target_amount: '', monthly_contribution: '' });
      setShowAddGoalForm(false);
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  const addPayment = async () => {
    if (!user || !newPayment.goal_id || !newPayment.amount) return;

    try {
      const payment = {
        user_id: user.id,
        goal_id: newPayment.goal_id,
        amount: parseFloat(newPayment.amount),
      };

      const { data, error } = await supabase
        .from('goal_payments')
        .insert([payment])
        .select()
        .single();

      if (error) throw error;

      setPayments((prev) => ({
        ...prev,
        [newPayment.goal_id]: [...(prev[newPayment.goal_id] || []), data],
      }));
      setNewPayment({ goal_id: '', amount: '' });
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      const { error } = await supabase
        .from('saving_money_calculations')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
      setPayments((prev) => {
        const updatedPayments = { ...prev };
        delete updatedPayments[goalId];
        return updatedPayments;
      });
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  };

  const calculateProgress = (goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    const totalPaid = (payments[goalId] || []).reduce((sum, p) => sum + p.amount, 0);
    return Math.min((totalPaid / goal.target_amount) * 100, 100);
  };

  const checkMissedPayments = (goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    const lastPayment = (payments[goalId] || []).slice(-1)[0];
    const lastPaymentDate = lastPayment ? new Date(lastPayment.payment_date) : null;
    const today = new Date();

    if (lastPaymentDate && differenceInDays(today, lastPaymentDate) > 30) {
      return true; // Missed payment
    }
    return false;
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <RequiredSubscription>
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-screen-md mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Saving Money Tracker</h1>
        <p className="text-lg text-gray-700 mb-6 text-center">
          Track your savings goals and progress over time.
        </p>

        {/* Toggle Add Goal Form */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddGoalForm((prev) => !prev)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            {showAddGoalForm ? 'Close Add Goal Form' : 'Add New Goal'}
          </button>
        </div>

        {/* Add Goal Form */}
        {showAddGoalForm && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Add New Goal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Goal Name"
                value={newGoal.goal_name}
                onChange={(e) => setNewGoal({ ...newGoal, goal_name: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="number"
                placeholder="Target Amount"
                value={newGoal.target_amount}
                onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="number"
                placeholder="Monthly Contribution"
                value={newGoal.monthly_contribution}
                onChange={(e) => setNewGoal({ ...newGoal, monthly_contribution: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={addGoal}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Save Goal
              </button>
            </div>
          </div>
        )}

        {/* Add Payment Form */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Add Payment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={newPayment.goal_id}
              onChange={(e) => setNewPayment({ ...newPayment, goal_id: e.target.value })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">Select Goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.goal_name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Payment Amount"
              value={newPayment.amount}
              onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={addPayment}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              Add Payment
            </button>
          </div>
        </div>

        {/* Goals List */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Your Goals</h2>
          {goals.length === 0 ? (
            <p className="text-gray-500">No goals added yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Goal</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Target</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Progress</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {goals.map((goal) => (
                  <tr key={goal.id}>
                    <td className="px-4 py-2">{goal.goal_name}</td>
                    <td className="px-4 py-2">${goal.target_amount.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <div className="relative w-full bg-gray-200 rounded-lg h-4">
                        <div
                          className="absolute top-0 left-0 h-4 bg-green-500 rounded-lg"
                          style={{ width: `${calculateProgress(goal.id)}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {calculateProgress(goal.id).toFixed(2)}% Complete
                      </p>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </RequiredSubscription>
  );
};

export default SavingMoneyCalculator;