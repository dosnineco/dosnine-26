import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import { Dialog } from "@headlessui/react";
import { FaPlusCircle } from "react-icons/fa";
import { supabase } from "../../lib/supabase";

export default function QuickExpenses() {
  const { user } = useUser();
const userId = user ? user.id : null;

const [isPopupOpen, setIsPopupOpen] = useState(false);
const [presets, setPresets] = useState([]);
const [expenses, setExpenses] = useState([]);
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

  const PopupWidget = () => (
    <Dialog
      open={isPopupOpen}
      onClose={() => setIsPopupOpen(false)}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 relative">
        <h2 className="text-lg font-semibold mb-4">Log Expense</h2>
        {presets.length === 0 ? (
          <p className="text-gray-500 text-base">No presets available.</p>
        ) : (
          presets.map((preset) => (
            <motion.div
              key={preset.id}
              className="w-auto bg-gray-200 text-gray-700 p-2 rounded-lg cursor-pointer flex justify-between items-center mb-2"
              onClick={() => {
                addExpense(preset.label, preset.amount, preset.category);
                setIsPopupOpen(false);
              }}
            >
              <span>
                {preset.label} - ${preset.amount}{" "}
                <span className="text-xs text-gray-500">({preset.category})</span>
              </span>
            </motion.div>
          ))
        )}
        <div className="flex justify-end mt-4">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded"
            onClick={() => setIsPopupOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );

  return (
    <>
      {/* Other page content */}
      <div className="fixed bottom-4 right-4 z-1000">
        <button
          className="bg-green-500 text-white p-4 rounded-full shadow-lg"
          onClick={() => setIsPopupOpen(true)}
        >
          <FaPlusCircle size={24} />
        </button>
      </div>

      {/* Popup Widget */}
      <PopupWidget />
    </>
  );
}