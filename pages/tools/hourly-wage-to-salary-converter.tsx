
// /pages/tools/hourly-wage-to-salary-converter.tsx

import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { NextPage } from 'next';

interface UserInput {
  hourlyWage: number;
  hoursPerWeek: number;
}

interface ChartData {
  name: string;
  value: number;
}

const HourlyWageToSalaryConverter: NextPage = () => {
  const [userInput, setUserInput] = useState<UserInput>({ hourlyWage: 0, hoursPerWeek: 0 });
  const [annualSalary, setAnnualSalary] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInput({ ...userInput, [name]: parseFloat(value) });
  };

  const calculateSalary = () => {
    const salary = userInput.hourlyWage * userInput.hoursPerWeek * 52;
    setAnnualSalary(salary);
    setChartData([
      { name: 'Hourly Wage', value: userInput.hourlyWage },
      { name: 'Annual Salary', value: salary },
    ]);
  };

  const exportCSV = () => {
    const csvData = `Hourly Wage,Hours Per Week,Annual Salary\n${userInput.hourlyWage},${userInput.hoursPerWeek},${annualSalary}`;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'salary_data.csv');
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Hourly Wage to Salary Converter</title>
        <meta name="description" content="Convert your hourly wage to an annual salary with ease." />
        <meta name="keywords" content="hourly wage, salary converter, personal finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/hourly-wage-to-salary-converter" />
      </Head>

      <h1 className="text-3xl font-bold text-center mb-6">Hourly Wage to Salary Converter</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Hourly Wage to Salary Converter! This tool helps you calculate your annual salary based on your hourly wage and the number of hours you work per week. Simply enter your details below and click "Calculate" to see your results.
      </p>

      <div className="mb-8">
        <label className="block mb-2 text-xl font-semibold" htmlFor="hourlyWage">Hourly Wage</label>
        <input
          type="number"
          id="hourlyWage"
          name="hourlyWage"
          value={userInput.hourlyWage}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />

        <label className="block mb-2 text-xl font-semibold" htmlFor="hoursPerWeek">Hours Per Week</label>
        <input
          type="number"
          id="hoursPerWeek"
          name="hoursPerWeek"
          value={userInput.hoursPerWeek}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />

        <button
          onClick={calculateSalary}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-4 focus:ring-blue-300"
        >
          Calculate
        </button>
      </div>

      {annualSalary > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">Your estimated annual salary is: <strong>${annualSalary.toFixed(2)}</strong></p>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>

          <button
            onClick={exportCSV}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 flex items-center"
          >
            <Download className="mr-2" /> Export as CSV
          </button>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips for Maximizing Your Earnings</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider negotiating your hourly rate if you feel underpaid.</li>
          <li>Look for opportunities to work overtime or take on additional shifts.</li>
          <li>Invest in skill development to qualify for higher-paying positions.</li>
          <li>Explore side hustles or freelance work to supplement your income.</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li><strong>How is the annual salary calculated?</strong> The annual salary is calculated by multiplying your hourly wage by the number of hours you work per week, then multiplying by 52 weeks.</li>
          <li><strong>Can I use this tool for part-time jobs?</strong> Yes, simply enter the number of hours you work per week for your part-time job.</li>
          <li><strong>Is this tool accurate?</strong> This tool provides an estimate based on the inputs you provide. Actual earnings may vary based on taxes, deductions, and other factors.</li>
        </ul>
      </div>
    </div>
  );
};

export default HourlyWageToSalaryConverter;


