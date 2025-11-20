import React, { useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';

// Types
interface LoanInput {
  principal: number;
  loanTerm: number;
}

interface RatePeriod {
  startYear: number;
  endYear: number;
  interestRate: number;
}

interface ChartData {
  name: string;
  payment: number;
  interest: number;
  principal: number;
}

// Main Component
const AdjustableRateLoanImpactCalculator: React.FC = () => {
  // State
  const [loanInput, setLoanInput] = useState<LoanInput>({ principal: 100000, loanTerm: 30 });
  const [ratePeriods, setRatePeriods] = useState<RatePeriod[]>([
    { startYear: 1, endYear: 5, interestRate: 5 },
    { startYear: 6, endYear: 30, interestRate: 7 },
  ]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);

  // Handlers
  const handleLoanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoanInput({ ...loanInput, [name]: parseFloat(value) });
  };

  const handleRatePeriodChange = (idx: number, field: keyof RatePeriod, value: number) => {
    const updated = [...ratePeriods];
    updated[idx][field] = value;
    setRatePeriods(updated);
  };

  const addRatePeriod = () => {
    setRatePeriods([
      ...ratePeriods,
      {
        startYear: ratePeriods.length ? ratePeriods[ratePeriods.length - 1].endYear + 1 : 1,
        endYear: loanInput.loanTerm,
        interestRate: 5,
      },
    ]);
  };

  const removeRatePeriod = (idx: number) => {
    setRatePeriods(ratePeriods.filter((_, i) => i !== idx));
  };

  // Calculation
  const calculateImpact = () => {
    let remainingPrincipal = loanInput.principal;
    let totalInterestPaid = 0;
    const data: ChartData[] = [];
    let totalMonths = 0;

    ratePeriods.forEach((period, idx) => {
      const months = (period.endYear - period.startYear + 1) * 12;
      totalMonths += months;
      const monthlyRate = period.interestRate / 100 / 12;
      // Calculate payment for this period (fixed payment for period)
      const payment =
        (remainingPrincipal * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -months));
      let interestPaid = 0;
      let principalPaid = 0;
      let principal = remainingPrincipal;

      for (let m = 0; m < months; m++) {
        const interest = principal * monthlyRate;
        const principalPart = payment - interest;
        interestPaid += interest;
        principalPaid += principalPart;
        principal -= principalPart;
      }

      data.push({
        name: `Years ${period.startYear}-${period.endYear}`,
        payment: parseFloat(payment.toFixed(2)),
        interest: parseFloat(interestPaid.toFixed(2)),
        principal: parseFloat(principalPaid.toFixed(2)),
      });

      totalInterestPaid += interestPaid;
      remainingPrincipal = principal;
    });

    setChartData(data);
    setTotalInterest(totalInterestPaid);
    setShowResults(true);
  };

  // Export CSV
  const exportCSV = () => {
    let csv = "Period,Monthly Payment,Interest Paid,Principal Paid\n";
    chartData.forEach(row => {
      csv += `${row.name},${row.payment},${row.interest},${row.principal}\n`;
    });
    csv += `Total Interest,,${totalInterest.toFixed(2)},\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "adjustable-rate-loan-impact.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // UI
  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <Head>
        <title>Adjustable Rate Loan Impact Calculator</title>
        <meta name="description" content="Calculate the impact of adjustable rate loans on your finances." />
        <meta name="keywords" content="loan calculator, adjustable rate, finance tool" />
        <link rel="canonical" href="https://www.expensegoose.com/tools/adjustable-rate-loan-impact-calculator" />
      </Head>
      <h1 className="text-3xl font-bold text-center mb-6">Adjustable Rate Loan Impact Calculator</h1>
      <p className="text-base text-gray-700 mb-4">
        Welcome to the Adjustable Rate Loan Impact Calculator. This tool helps you understand how changes in interest rates can affect your monthly payments and overall loan cost.
      </p>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Loan Details</h2>
        <form className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="principal" className="text-base font-semibold mb-2">Principal ($)</label>
            <input
              type="number"
              id="principal"
              name="principal"
              value={loanInput.principal}
              onChange={handleLoanInputChange}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="loanTerm" className="text-base font-semibold mb-2">Loan Term (years)</label>
            <input
              type="number"
              id="loanTerm"
              name="loanTerm"
              value={loanInput.loanTerm}
              onChange={handleLoanInputChange}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <h3 className="text-xl font-semibold mb-2 mt-4">Interest Rate Periods</h3>
          {ratePeriods.map((period, idx) => (
            <div key={idx} className="flex flex-wrap gap-4 items-end mb-2">
              <div>
                <label className="block text-sm font-medium mb-1">Start Year</label>
                <input
                  type="number"
                  min={1}
                  max={loanInput.loanTerm}
                  value={period.startYear}
                  onChange={e => handleRatePeriodChange(idx, "startYear", parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2 py-1 w-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Year</label>
                <input
                  type="number"
                  min={period.startYear}
                  max={loanInput.loanTerm}
                  value={period.endYear}
                  onChange={e => handleRatePeriodChange(idx, "endYear", parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2 py-1 w-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={period.interestRate}
                  onChange={e => handleRatePeriodChange(idx, "interestRate", parseFloat(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2 py-1 w-24"
                />
              </div>
              {ratePeriods.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRatePeriod(idx)}
                  className="text-red-600 hover:text-red-900 px-2 py-1"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addRatePeriod}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 mt-2"
          >
            + Add Rate Period
          </button>
          <button
            type="button"
            onClick={calculateImpact}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 mt-4"
          >
            Calculate
          </button>
        </form>
      </div>
      {showResults && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p className="text-base text-gray-700 mb-4">
            Total interest paid: <span className="font-bold">${totalInterest.toFixed(2)}</span>
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="payment" fill="#8884d8" name="Monthly Payment" />
              <Bar dataKey="interest" fill="#fbbf24" name="Interest Paid" />
              <Bar dataKey="principal" fill="#34d399" name="Principal Paid" />
            </BarChart>
          </ResponsiveContainer>
          <button
            onClick={exportCSV}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 flex items-center"
          >
            <Download className="mr-2" /> Export Results
          </button>
        </div>
      )}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips</h2>
        <ul className="list-disc list-inside mb-4 text-base">
          <li>Consider refinancing if interest rates drop significantly.</li>
          <li>Paying extra towards the principal can reduce the total interest paid.</li>
          <li>Regularly review your loan terms to ensure they align with your financial goals.</li>
          <li>Model multiple rate scenarios to understand your risk.</li>
        </ul>
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <FAQ />
      </div>
    </div>
  );
};

// FAQ Component
const FAQ: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xl font-semibold mb-2">What is an adjustable rate loan?</h3>
      <p className="text-base text-gray-700 mb-4">
        An adjustable rate loan is a type of loan where the interest rate can change periodically based on the market conditions.
      </p>
    </div>
    <div>
      <h3 className="text-xl font-semibold mb-2">How often do interest rates change?</h3>
      <p className="text-base text-gray-700 mb-4">
        The frequency of interest rate changes depends on the terms of your loan. It could be monthly, annually, or at another interval.
      </p>
    </div>
    <div>
      <h3 className="text-xl font-semibold mb-2">Can I switch from an adjustable rate to a fixed rate?</h3>
      <p className="text-base text-gray-700 mb-4">
        Yes, many lenders offer the option to refinance your loan from an adjustable rate to a fixed rate.
      </p>
    </div>
  </div>
);

export default AdjustableRateLoanImpactCalculator;