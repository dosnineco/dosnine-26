import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import { Dialog } from "@headlessui/react";
import { useRouter } from "next/router";
import { FaPlusCircle } from 'react-icons/fa';
import { FaInfoCircle } from 'react-icons/fa';


export default function QuickExpenses() {
  const { user } = useUser();
  const router = useRouter();
  const userId = user ? user.id : null;
    const [isInfoOpen, setIsInfoOpen] = useState(false);


  const [expenses, setExpenses] = useState([]);
  const [presets, setPresets] = useState([]);
  const [newPreset, setNewPreset] = useState({ label: "", amount: "", category: "other" });


  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const now = new Date();
const localDate = new Date().toLocaleDateString("en-CA"); // Outputs in YYYY-MM-DD format
  useEffect(() => {
    if (userId) {
      fetchPresets();
    }
  }, [userId]);

  const fetchPresets = async () => {
    const { data, error } = await supabase
      .from("presets")
      .select("id, label, amount, category")
      .eq("user_id", userId);
    if (error) console.error("Error fetching presets:", error);
    else setPresets(data);
  };

  const addExpense = async (label, amount,category) => {
    if (!userId) {
      console.error("User not logged in");
      return;
    }

    const newExpense = { label, amount, category, date: new Date().toLocaleString() };
    setExpenses([...expenses, newExpense]);
    
    const { error } = await supabase.from("transactions").insert([
      {
        user_id: userId,
        transaction_date: localDate,
        post_date: localDate,
        description: label,
        amount: amount,
        category: category  // Use category from preset or default to "other"
      }
    ]);
    if (error) console.error("Error saving expense:", error);
  };

  const addPreset = async () => {
    if (!userId) {
      console.error("User not logged in");
      return;
    }
    
    if (newPreset.label && newPreset.amount) {
      const amount = parseFloat(newPreset.amount);
      if (!isNaN(amount)) {
        const { error } = await supabase.from("presets").insert([
          {
            user_id: userId,
            label: newPreset.label,
            amount,
            category: newPreset.category // Save category
          }
        ]);
        if (error) console.error("Error saving preset:", error);
        else {
          setPresets([...presets, { id: Date.now(), label: newPreset.label, amount, category: newPreset.category }]);
          setNewPreset({ label: "", amount: "", category: "other" });
          setIsDialogOpen(false);
        }
      }
    }
  };

  const deletePreset = async (id) => {
    setPresets(presets.filter((preset) => preset.id !== id));
    
    const { error } = await supabase.from("presets").delete().eq("id", id);
    if (error) console.error("Error deleting preset:", error);
  };

  const ListofPresets = () => {
    if (presets.length === 0) {
      return <p className="text-gray-500 text-base">No presets added.</p>;
    }
    return presets.map((preset) => (
      <motion.div
        key={preset.id}
        className="w-auto bg-gray-200 text-gray-700 p-2 rounded-lg cursor-pointer flex justify-between items-center"
        onClick={() => addExpense(preset.label, preset.amount, preset.category)}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(event, info) => {
          if (info.offset.x < -100) deletePreset(preset.id);
        }}
      >
        <span>{preset.label} - ${preset.amount} <span className="text-xs text-gray-500">({preset.category})</span></span>
      </motion.div>
    ));
  };

  const LogofExpenses = () => {

    if (expenses.length === 0) {
      return <p className="text-gray-500 text-base">No expenses logged yet.</p>;
    }
    return expenses.map((expense, index) => (
      <motion.li
        key={index}
        className="border-b py-1 flex justify-between items-center"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(event, info) => {
          if (info.offset.x < -100) {
            setExpenses(expenses.filter((_, i) => i !== index));
          }
        }}
      >
        <span>{expense.label} - ${expense.amount} <span className="text-xs text-gray-500">({expense.date})</span></span>
      </motion.li>
    ));
  }


  if (userId === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">Please log in to view your expenses.</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">Loading...</p>
      </div>
    );
  }
  if (userId === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">User not found.</p>
      </div>
    );
  }
  if (presets === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">Loading presets...</p>
      </div>
    );
  }
  if (presets === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">No presets found.</p>
      </div>
    );
  }
  if (expenses === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">Loading expenses...</p>
      </div>
    );
  }
  if (expenses === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">No expenses found.</p>
      </div>
    );
  }
  if (isDialogOpen === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">Loading dialog...</p>
      </div>
    );
  }
  if (isDialogOpen === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-base">Dialog not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-[600px] mx-auto text-gray-800 rounded-lg">
    <button
        className="bg-gray-500 text-white p-2 rounded-lg mb-6 flex items-center"
        onClick={() => router.push('/expense-tracker')} 
      >
        ← Back
      </button>
      <div className="flex justify-between items-center mb-4">
      
        <h2 className="text-lg font-semibold">Quick Expenses Preset</h2>
        <button
          className="text-blue-600 hover:text-blue-800 flex items-center"
          onClick={() => setIsInfoOpen(true)}
        >
          <FaInfoCircle className="mr-2" />
          How to Use
        </button>
      </div>

      {/* Info Modal */}
      {isInfoOpen && (
        <Dialog
          open={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 relative">
            <h2 className="text-lg font-semibold mb-4">How to Use</h2>
            <ul className="list-disc list-inside text-gray-700 text-base space-y-2">
              <li>Quickly log your expenses using presets.</li>
              <li>Click on a preset to log an expense.</li>
              <li>Drag left to delete a preset.</li>
              <li>Drag left to delete an expense.</li>
              <li>Click the plus icon to add a new preset.</li>
              <li>Click the preset to log an expense.</li>
            </ul>
            <div className="flex justify-end mt-4">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => setIsInfoOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )}

     


      {/* Presents */}
      <div className="  flex flex-col gap-2 mb-4">
        <ListofPresets />
      </div>


      <div className="flex justify-center">
      <button className="bg-gray-300 text-black flex items-center p-4 rounded-lg" onClick={() => setIsDialogOpen(true)}>
        <FaPlusCircle />
      </button>
    </div>
      <h3 className="text-lg font-semibold mt-4 mb-2">Expense Log</h3>
      <LogofExpenses />

      {/* Add Preset Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-80 relative">
          <h2 className="text-lg font-semibold mb-4">Add Preset</h2>
          <input
            type="text"
            placeholder="eg. Groceries"
            className="w-full p-2 mb-2 border rounded"
            value={newPreset.label}
            onChange={(e) => setNewPreset({ ...newPreset, label: e.target.value })}
          />
          <input
            type="number"
            placeholder="eg. 5000"
            className="w-full p-2 mb-4 border rounded"
            value={newPreset.amount}
            onChange={(e) => setNewPreset({ ...newPreset, amount: e.target.value })}
          />
          <select
            value={newPreset.category || "other"}
            onChange={(e) => setNewPreset({ ...newPreset, category: e.target.value })}
            className="w-full border rounded px-2 py-1 mb-4"
          >
            <option value="food">Food</option>
            <option value="shopping">Shopping</option>
            <option value="transport">Transport</option>
            <option value="housing">Housing</option>
            <option value="entertainment">Entertainment</option>
            <option value="investments">Investments</option>
            <option value="other">Other</option>
          </select>
          <div className="flex justify-end gap-2">
            <button className="bg-gray-500 text-white p-2 rounded" onClick={() => setIsDialogOpen(false)}>Cancel</button>
            <button className="bg-gray-700 text-white p-2 rounded" onClick={addPreset}>Save</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
