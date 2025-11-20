import React from 'react';

const About = () => {
  return (
    <div className="w-full max-w-screen-md  mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-xl font-bold text-gray-800 mb-4">About Expense Goose</h1>
        <p className="text-base  text-gray-600">
          Simplifying your finances, one step at a time.
        </p>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl  p-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Our Mission</h2>
        <p className="text-gray-600 text-base  leading-relaxed mb-6">
          At Expense Goose, we believe that managing your finances should be simple, intuitive, and stress-free. 
          Our mission is to empower individuals and families to take control of their spending, saving, and budgeting 
          with tools that are easy to use and accessible to everyone.
        </p>

        <h2 className="text-base font-semibold text-gray-800 mb-4">Why Choose Us?</h2>
        <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
          <li>Easy-to-use budgeting tools tailored to your needs.</li>
          <li>Insights to help you save more and spend smarter.</li>
          <li>Secure and reliable platform for managing your finances.</li>
        </ul>

        <h2 className="text-base  font-semibold text-gray-800 mb-4">Our Story</h2>
        <p className="text-gray-600 text-base  leading-relaxed">
          Expense Goose was founded with the vision of making financial management accessible to everyone. 
          Whether you're tracking your monthly expenses, planning for a big purchase, or simply trying to save more, 
          we’re here to help you achieve your goals. Join thousands of users who trust Expense Goose to simplify their finances.
        </p>
      </div>

   
    </div>
  );
};

export default About;