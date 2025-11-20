import React from "react";

export default function SignupBanner() {
  return (
    <div className="w-full flex justify-center items-center py-4 px-2 bg-blue-50 border border-blue-200 rounded-lg my-4">
      <span className="text-base text-gray-700">
        Create a <span className="font-bold">FREE</span> expensegoose account to track your expenses.
      </span>
      <a
        href="https://www.expensegoose.com/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        className="w-32 ml-3 md:w-24 text-center text-base px-3 py-2 bg-blue-500 text-white text-base rounded hover:bg-blue-600 focus:outline-none transition"
      >
        Sign Up
      </a>
    </div>
  );
}