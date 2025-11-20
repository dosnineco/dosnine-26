import React from 'react';

const WalkthroughModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Welcome to Budget Planner!</h2>
        <p className="text-gray-700 mb-4">
          Let's set up your budget. Follow these steps to get started:
        </p>
        <ol className="list-decimal list-inside text-gray-700 mb-4">
          <li>Create your budget categories.</li>
          <li>Set your monthly budget and category limits.</li>
          <li>Track your expenses and analyze your spending.</li>
        </ol>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default WalkthroughModal;