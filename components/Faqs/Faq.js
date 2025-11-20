import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const FAQ = () => {
  const faqs = [
    {question:'do expense goose track travel expenses? ',answer:'Yes, it tracks all expenses.'},
    
    {question: 'What is Expense goose?', answer: 'it is a expense tracking software for small businesses. Manage your finances with powerful expense management tools and tracking software.'},
    {question:'How much does it cost?', answer: 'It is 15USD for small businesses and personal use.'},
    {question: 'What are the benefits of using Expense Goose?', answer: 'Expense Goose is the leading free expense tracking software for small businesses. Manage your finances with powerful expense management tools and tracking software.'},
    {question:'Do you have a paid version?', answer: 'Yes, it is 15USD for small businesses and personal use.'},
    {question:'How do I get help?', answer: 'You can contact us at https://www.expensegoose.com/contact-us'},
    {question:'what is the best way to track expenses?', answer: 'The best way to track expenses is to use a software that allows you to categorize and track your expenses in real-time.'},

  ];

  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <section className="min-h-screen  w-full rounded-lg py-10 px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl pt-6 font-bold text-inherit text-center mb-4">Frequently Asked Questions</h2>
      <p className="text-center text-sm text-inherit mb-8">Have no worries, we got you.</p>
      <div className="max-w-2xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg bg-white  transition-all"
          >
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleAccordion(index)}
            >
              <h3 className="text-gray-800 font-medium text-xl">{faq.question}</h3>
              <span className="text-gray-500">
                {activeIndex === index ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
              </span>
            </div>
            {activeIndex === index && (
              <div className="px-4 py-3 text-gray-600 border-t border-gray-200">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
