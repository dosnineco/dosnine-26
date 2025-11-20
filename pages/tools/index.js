import { 
  BarChart2, 
  Calculator, 
  Mail, 
  DollarSign,
  Settings,
  Search,
  Award,
  MapPin,
  PiggyBank,
  Banknote,
  PieChart,
  Wallet,
  TrendingUp,
  ClipboardList
} from "lucide-react";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '../../lib/supabase';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { ArrowRight, PenTool as Tool, Zap, Users, BookOpen, Car } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function ToolsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('is_subscribed')
            .eq('clerk_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching subscription status:', error);
          } else {
            setIsSubscribed(data?.is_subscribed || false);
          }
        } catch (err) {
          console.error('Unexpected error checking subscription status:', err);
        }
      }
      setLoading(false);
    };

    checkSubscriptionStatus();
  }, [user]);

const tools = [

  {
    title: "Expense Tracker",
    description: "Track and analyze your spending data",
    icon: Wallet,
    path: "/expense-tracker",
    color: "text-orange-600",
    bgHover: "hover:bg-orange-50",
    highlight: true, 
  },
    {
      title: "Saving Money Calculator",
      description: "Project how much you can save over time",
      icon: PiggyBank,
      path: "/saving-money-calculator",
      color: "text-stone-600",
      bgHover: "hover:bg-stone-50",
    },
    {
      title: "Sales Tracker",
      description: " ",
      icon: Calculator,
      path: "/sales-tracker",
      color: "text-yellow-600",
      bgHover: "hover:bg-yellow-50",
    },
        {
      title: "Vector image generator",
      description: " ",
      icon: Tool,
      path: "/tools/vector",
      color: "text-blue-600",
      bgHover: "hover:bg-blue-50",
    },
    {
      title: "Cost of Living Calculator",
      description: " ",
      icon: Calculator,
      path: "/tools/cost-of-living",
      color: "text-green-600",
      bgHover: "hover:bg-green-50",
    },

    {
      title: "Living Expenses Calculator",
      description: "Calculate your monthly living expenses",
      icon: BarChart2,
      path: "/tools/living-expenses",
      color: "text-pink-600",
      bgHover: "hover:bg-pink-50",
    },
    {
      title: "Monthly Spending Calculator",
      description: "Estimate your monthly spending based on your income and expenses",
      icon: Mail,
      path: "/tools/monthly-calculator",
      color: "text-blue-600",
      bgHover: "hover:bg-blue-50",
    },
    {
      title: "Auto Loan Calculator",
      description: "Calculate your monthly auto loan payments",
      icon: Car,
      path: "/tools/auto-loan-calculator",
      color: "text-blue-600",
      bgHover: "hover:bg-blue-50",
    },
    {
      title: "Emergency Fund Calculator",
      description: "Estimate the amount to save for emergencies",
      icon: PiggyBank,
      path: "/tools/emergency-fund-calculator",
      color: "text-red-600",
      bgHover: "hover:bg-red-50",
    },
    {
      title: "Retirement Spending Calculator",
      description: "Plan how much you'll need in retirement",
      icon: Award,
      path: "/tools/retirement-spending-calculator",
      color: "text-indigo-600",
      bgHover: "hover:bg-indigo-50",
    },
    {
      title: "Grocery Budget Calculator",
      description: "Set your monthly grocery spending",
      icon: DollarSign,
      path: "/tools/grocery-budget-calculator",
      color: "text-pink-600",
      bgHover: "hover:bg-pink-50",
    },
    {
      title: "Relocation Calculator",
      description: "Compare expenses when moving to a new city",
      icon: MapPin,
      path: "/tools/relocation-calculator",
      color: "text-teal-600",
      bgHover: "hover:bg-teal-50",
    }
  ];
  
  const filteredTools = tools.filter(tool =>
    tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
const [monthlySpendingData, setMonthlySpendingData] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMonthlySpendingData();
    }
  }, [user]);

const fetchMonthlySpendingData = async () => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, amount')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    if (data && data.length > 0) {
      // Aggregate spending by month
      const spendingByMonth = data.reduce((acc, transaction) => {
        const month = new Date(transaction.transaction_date).toISOString().slice(0, 7); // Format: YYYY-MM
        acc[month] = (acc[month] || 0) + parseFloat(transaction.amount);
        return acc;
      }, {});

      // Format data for the graph
      const formattedData = Object.entries(spendingByMonth).map(([month, total]) => ({
        month,
        total,
      }));

      // Sort by month
      formattedData.sort((a, b) => new Date(a.month) - new Date(b.month));

      setMonthlySpendingData(formattedData);
    } else {
      setMonthlySpendingData([]); // Set an empty array if no data is returned
    }
  } catch (err) {
    console.error('Failed to fetch monthly spending data:', err);
  }
};

const graphData = {
  labels: monthlySpendingData.map((item) => item.month),
  datasets: [
    {
      label: 'Monthly Spending',
      data: monthlySpendingData.map((item) => item.total),
      borderColor: '#FBBF24', // Gold-like color for the line
      backgroundColor: 'rgba(251, 191, 36, 0.2)', // Transparent gold fill
      pointBackgroundColor: '#FBBF24', // Gold color for points
      pointBorderColor: '#FBBF24',
      pointHoverBackgroundColor: '#FBBF24',
      pointHoverBorderColor: '#FBBF24',
      pointRadius: 5, // Size of the points
      pointHoverRadius: 7, // Size of the points on hover
      tension: 0.4, // Smooth curve
    },
  ],
};

const graphOptions = {
  responsive: true,
  maintainAspectRatio: false, // Allow the graph to resize dynamically
  plugins: {
    legend: {
      display: false, // Hide the legend
    },
    tooltip: {
      backgroundColor: '#1F2937', // Dark background for the tooltip
      titleColor: '#FFFFFF', // White title text
      bodyColor: '#FFFFFF', // White body text
      borderColor: '#FBBF24', // Gold border
      borderWidth: 3,
      cornerRadius: 4,
      callbacks: {
        title: (tooltipItems) => {
          const month = tooltipItems[0].label;
          return `${month}`; // Display the month
        },
        label: (context) => `$${context.raw.toFixed(2)}`, // Display the amount
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false, // Hide gridlines on the x-axis
      },
      ticks: {
        color: '#6B7280', // Gray color for x-axis labels
        font: {
          size: 12,
        },
      },
    },
    y: {
      grid: {
        color: '#E5E7EB', // Light gray gridlines
        drawBorder: false, // Hide the border
      },
      ticks: {
        color: '#6B7280', // Gray color for y-axis labels
        font: {
          size: 12,
        },
        callback: (value) => `$${value}`, // Add a dollar sign to y-axis labels
      },
    },
  },
};


  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl  p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Free Tools</h1>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              return tool.comingSoon ? (
                <div
                  key={tool.title}
                  className={`group block p-4 rounded-lg bg-gray-100 transition-all duration-200 ${tool.bgHover}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${tool.color} bg-opacity-10 flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-base font-semibold text-gray-400">
                      {tool.title}
                    </h2>
                  </div>
                </div>
              ) : (
                 <a
      key={tool.path}
      href={tool.path}
      className={`group block p-4 rounded-lg bg-gray-50 transition-all duration-200 ${tool.bgHover} ${
        tool.highlight ? 'border-2 border-orange-400 shadow-lg bg-orange-50 ' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${tool.color} bg-opacity-10 flex items-center justify-center`}>
          <Icon className={`w-8 h-8 ${tool.color}`} />
        </div>
        <div className="flex-1">
          <h2 className={`text-base font-semibold ${tool.highlight ? 'text-orange-800' : 'text-inherit'}`}>
            {tool.title}
          </h2>
          {tool.highlight && (
            <span className="mt-1 inline-block text-xs font-bold text-orange-600 bg-white border border-orange-300 rounded px-2 py-0.5">
              Core Tool
            </span>
          )}
        </div>
      </div>
    </a>
  );
})}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolsPage;