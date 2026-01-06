import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, Users, MapPin, ArrowUpRight, ArrowDownRight, AlertCircle, DollarSign, Target, Zap, Lock } from 'lucide-react';
import Link from 'next/link';

export default function ParishRequestAnalytics() {
  const [visitorData, setVisitorData] = useState({});
  const [serviceRequestData, setServiceRequestData] = useState({});
  const [budgetByParish, setBudgetByParish] = useState({});
  const [priceRanges, setPriceRanges] = useState({});
  const [trendingParishes, setTrendingParishes] = useState([]);
  const [demandByPricePoint, setDemandByPricePoint] = useState({});
  const [underservedAreas, setUnderservedAreas] = useState([]);
  const [requestsByType, setRequestsByType] = useState({});
  const [weeklyVolume, setWeeklyVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  const jamaicaParishes = [
    'Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
    'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland',
    'St. Elizabeth', 'Manchester', 'Clarendon', 'St. Catherine'
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch visitor emails by parish
      const { data: visitors } = await supabase
        .from('visitor_emails')
        .select('parish, created_at')
        .not('parish', 'is', null);

      // Fetch service requests with budget and location
      const { data: requests } = await supabase
        .from('service_requests')
        .select('location, budget_min, budget_max, created_at');

      // Process visitor data
      const visitorCounts = {};
      jamaicaParishes.forEach(p => visitorCounts[p] = 0);
      
      visitors?.forEach(item => {
        if (item.parish && visitorCounts.hasOwnProperty(item.parish)) {
          visitorCounts[item.parish]++;
        }
      });
      setVisitorData(visitorCounts);

      // Process service requests by location/parish
      const requestCounts = {};
      const budgetByParishData = {};
      const priceRangesData = {};

      jamaicaParishes.forEach(p => {
        requestCounts[p] = 0;
        budgetByParishData[p] = { low: 0, medium: 0, high: 0 };
        priceRangesData[p] = { avgMin: 0, avgMax: 0, count: 0 };
      });

      requests?.forEach(item => {
        // Match location to parish
        const matchedParish = jamaicaParishes.find(p => 
          item.location?.toLowerCase().includes(p.toLowerCase())
        );
        
        if (matchedParish) {
          requestCounts[matchedParish]++;

          // Budget categorization
          const minBudget = item.budget_min || 0;
          if (minBudget < 10000000) {
            budgetByParishData[matchedParish].low++;
          } else if (minBudget < 50000000) {
            budgetByParishData[matchedParish].medium++;
          } else {
            budgetByParishData[matchedParish].high++;
          }

          // Price ranges
          if (priceRangesData[matchedParish]) {
            priceRangesData[matchedParish].avgMin += item.budget_min || 0;
            priceRangesData[matchedParish].avgMax += item.budget_max || 0;
            priceRangesData[matchedParish].count++;
          }
        }
      });

      // Calculate averages for price ranges
      Object.keys(priceRangesData).forEach(parish => {
        if (priceRangesData[parish].count > 0) {
          priceRangesData[parish].avgMin = Math.round(priceRangesData[parish].avgMin / priceRangesData[parish].count);
          priceRangesData[parish].avgMax = Math.round(priceRangesData[parish].avgMax / priceRangesData[parish].count);
        }
      });

      // Identify trending parishes (most recent activity)
      const parishActivity = {};
      visitors?.forEach(item => {
        if (item.parish) {
          if (!parishActivity[item.parish]) parishActivity[item.parish] = [];
          parishActivity[item.parish].push(new Date(item.created_at).getTime());
        }
      });

      const trending = Object.entries(parishActivity)
        .map(([parish, dates]) => ({
          parish,
          count: dates.length,
          lastActivity: Math.max(...dates)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setServiceRequestData(requestCounts);
      setBudgetByParish(budgetByParishData);
      setPriceRanges(priceRangesData);
      setTrendingParishes(trending);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentages = (data) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0) || 1;
    const percentages = {};
    Object.entries(data).forEach(([key, value]) => {
      percentages[key] = ((value / total) * 100).toFixed(1);
    });
    return percentages;
  };

  const visitorPercentages = calculatePercentages(visitorData);
  const requestPercentages = calculatePercentages(serviceRequestData);
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    if (price >= 1000000) return `JMD ${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `JMD ${(price / 1000).toFixed(0)}K`;
    return `JMD ${price}`;
  };

  const BarGraph = ({ data, percentages, title, icon: Icon, color }) => {
    const topParishes = Object.entries(percentages)
      .filter(([, percentage]) => parseFloat(percentage) > 0)
      .sort(([, a], [, b]) => parseFloat(b) - parseFloat(a));

    if (topParishes.length === 0) {
      return null;
    }

    const maxValue = Math.max(...topParishes.map(([, p]) => parseFloat(p)), 1);

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-accent">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${color}`} />
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        
        <div className="space-y-3">
          {topParishes.map(([parish, percentage]) => {
            const displayPercentage = parseFloat(percentage);
            const barWidth = (displayPercentage / maxValue) * 100;
            
            return (
              <div key={parish}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{parish}</span>
                  <span className="text-sm font-bold text-accent">{displayPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${color.replace('text-', 'bg-')}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BudgetByParishGraph = () => {
    const parishesWithRequests = Object.entries(budgetByParish)
      .filter(([, budgets]) => budgets.low + budgets.medium + budgets.high > 0)
      .sort(([, a], [, b]) => (b.low + b.medium + b.high) - (a.low + a.medium + a.high))
      .slice(0, 8);

    if (parishesWithRequests.length === 0) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-green-500">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-gray-900">Budget Range Requests by Parish</h3>
        </div>

        <div className="space-y-4">
          {parishesWithRequests.map(([parish, budgets]) => {
            const total = budgets.low + budgets.medium + budgets.high;
            const lowPct = ((budgets.low / total) * 100).toFixed(0);
            const mediumPct = ((budgets.medium / total) * 100).toFixed(0);
            const highPct = ((budgets.high / total) * 100).toFixed(0);

            return (
              <div key={parish}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{parish}</span>
                </div>
                
                <div className="flex h-7 rounded-full overflow-hidden bg-gray-100">
                  {budgets.low > 0 && (
                    <div
                      className="bg-orange-500 transition-all duration-300"
                      style={{ width: `${lowPct}%` }}
                      title={`Low: ${budgets.low}`}
                    />
                  )}
                  {budgets.medium > 0 && (
                    <div
                      className="bg-blue-500 transition-all duration-300"
                      style={{ width: `${mediumPct}%` }}
                      title={`Medium: ${budgets.medium}`}
                    />
                  )}
                  {budgets.high > 0 && (
                    <div
                      className="bg-green-500 transition-all duration-300"
                      style={{ width: `${highPct}%` }}
                      title={`High: ${budgets.high}`}
                    />
                  )}
                </div>
                
                <div className="flex gap-3 mt-1.5 text-xs font-medium">
                  {budgets.low > 0 && <span className="text-orange-600">Low {lowPct}%</span>}
                  {budgets.medium > 0 && <span className="text-blue-600">Mid {mediumPct}%</span>}
                  {budgets.high > 0 && <span className="text-green-600">High {highPct}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TrendingParishesCard = () => {
    if (trendingParishes.length === 0) return null;

    const totalSearches = trendingParishes.reduce((sum, item) => sum + item.count, 0);

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-purple-500">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Trending Areas</h3>
        </div>

        <div className="space-y-3">
          {trendingParishes.map((item, idx) => {
            const percentage = ((item.count / totalSearches) * 100).toFixed(1);
            return (
              <div key={item.parish} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.parish}</p>
                    <p className="text-xs text-gray-600">{percentage}% of recent searches</p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BudgetDistributionCard = () => {
    const parishesWithData = Object.entries(budgetByParish)
      .filter(([, budgets]) => budgets.low + budgets.medium + budgets.high > 0)
      .sort(([, a], [, b]) => (b.low + b.medium + b.high) - (a.low + a.medium + a.high))
      .slice(0, 8);

    if (parishesWithData.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-blue-500">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Budget Distribution by Parish</h3>
        </div>

        <div className="space-y-4">
          {parishesWithData.map(([parish, budgets]) => {
            const total = budgets.low + budgets.medium + budgets.high;
            const lowPct = ((budgets.low / total) * 100).toFixed(0);
            const mediumPct = ((budgets.medium / total) * 100).toFixed(0);
            const highPct = ((budgets.high / total) * 100).toFixed(0);

            return (
              <div key={parish}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{parish}</span>
                </div>
                
                {/* Stacked bar */}
                <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
                  {budgets.low > 0 && (
                    <div
                      className="bg-orange-500 transition-all duration-300"
                      style={{ width: `${lowPct}%` }}
                      title={`Low: ${lowPct}%`}
                    />
                  )}
                  {budgets.medium > 0 && (
                    <div
                      className="bg-blue-500 transition-all duration-300"
                      style={{ width: `${mediumPct}%` }}
                      title={`Medium: ${mediumPct}%`}
                    />
                  )}
                  {budgets.high > 0 && (
                    <div
                      className="bg-green-500 transition-all duration-300"
                      style={{ width: `${highPct}%` }}
                      title={`High: ${highPct}%`}
                    />
                  )}
                </div>
                
                {/* Legend */}
                <div className="flex gap-3 mt-1.5 text-xs font-medium">
                  {budgets.low > 0 && <span className="text-orange-600">Low {lowPct}%</span>}
                  {budgets.medium > 0 && <span className="text-blue-600">Mid {mediumPct}%</span>}
                  {budgets.high > 0 && <span className="text-green-600">High {highPct}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const DemandPricePointGraph = () => {
    const total = Object.values(demandByPricePoint).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const priceLabels = [
      { key: 'under120k', label: 'Under J$120k', color: 'bg-green-500' },
      { key: '120k-200k', label: 'J$120k-200k', color: 'bg-blue-500' },
      { key: '200k-300k', label: 'J$200k-300k', color: 'bg-indigo-500' },
      { key: '300k-500k', label: 'J$300k-500k', color: 'bg-purple-500' },
      { key: 'above500k', label: 'Above J$500k', color: 'bg-red-500' }
    ];

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-emerald-500">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-gray-900">Real Demand by Monthly Rental Budget</h3>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Market Reality</span>
        </div>

        <div className="space-y-3">
          {priceLabels.map(({ key, label, color }) => {
            const count = demandByPricePoint[key] || 0;
            const pct = ((count / total) * 100).toFixed(1);
            
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded">
          <p className="text-xs text-amber-900 font-semibold">💡 Insight: Most demand is in sub-J$200k range (mass market, not luxury)</p>
        </div>
      </div>
    );
  };

  const UnderservedDemandCard = () => {
    if (underservedAreas.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-red-500">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-bold text-gray-900">Underserved Demand Alerts</h3>
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">High Opportunity</span>
        </div>

        <div className="space-y-2">
          {underservedAreas.map((area) => (
            <div key={area.parish} className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{area.parish}</p>
                  <p className="text-xs text-red-700 font-semibold">{area.demand} searches, {area.supply || 'no'} listings</p>
                  <p className="text-xs text-gray-600 mt-1">Demand/Supply Ratio: {area.ratio.toFixed(1)}:1</p>
                </div>
                <Target className="w-5 h-5 text-red-500" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <p className="text-xs text-red-900 font-semibold">📊 Data Says: High searcher interest, low property supply = pricing power for owners</p>
        </div>
      </div>
    );
  };

  const DemandSupplyRatioCard = () => {
    // Get all parishes with demand/supply data
    const parishRatios = jamaicaParishes
      .map(parish => ({
        parish,
        demand: visitorData[parish] || 0,
        supply: serviceRequestData[parish] || 0,
        ratio: (visitorData[parish] || 0) / Math.max((serviceRequestData[parish] || 1), 1)
      }))
      .filter(area => area.demand > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 8);

    if (parishRatios.length === 0) return null;

    const maxRatio = Math.max(...parishRatios.map(p => p.ratio), 1);

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-indigo-500">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">Demand vs Supply Ratio</h3>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Market Balance</span>
        </div>

        <div className="space-y-4">
          {parishRatios.map((parish) => {
            const barWidth = (parish.ratio / maxRatio) * 100;
            const ratioColor = parish.ratio > 3 ? 'bg-red-500' : parish.ratio > 1.5 ? 'bg-amber-500' : 'bg-green-500';
            
            return (
              <div key={parish.parish}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">{parish.parish}</span>
                  <div className="flex gap-2 items-center text-xs">
                    <span className="text-blue-600 font-bold">{parish.demand} demand</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-green-600 font-bold">{parish.supply} supply</span>
                    <span className="text-gray-400">•</span>
                    <span className="font-bold text-indigo-700">{parish.ratio.toFixed(1)}:1</span>
                  </div>
                </div>
                
                <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
                  {/* Demand side */}
                  <div className="bg-blue-400" style={{ width: `${Math.min((parish.demand / (parish.demand + parish.supply)) * 100, 100)}%` }} />
                  {/* Supply side */}
                  <div className="bg-green-400" style={{ width: `${Math.min((parish.supply / (parish.demand + parish.supply)) * 100, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-xs text-blue-900 font-semibold">🎯 Interpretation: Blue = Searcher Demand | Green = Available Supply | Ratio shows searchers per listing</p>
        </div>
      </div>
    );
  };

  const RequestTypeDistributionCard = () => {
    const total = (requestsByType?.rent || 0) + (requestsByType?.buy || 0) + (requestsByType?.sell || 0);
    if (total === 0) return null;

    const rentPct = (((requestsByType?.rent || 0) / total) * 100).toFixed(0);
    const buyPct = (((requestsByType?.buy || 0) / total) * 100).toFixed(0);
    const sellPct = (((requestsByType?.sell || 0) / total) * 100).toFixed(0);

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-t-cyan-500">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-cyan-600" />
          <h3 className="text-lg font-bold text-gray-900">Market Intent Distribution</h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">Rental Interest</span>
              <span className="text-sm font-bold text-cyan-700">{rentPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full bg-cyan-500" style={{ width: `${rentPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">Purchase Interest</span>
              <span className="text-sm font-bold text-blue-700">{buyPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full bg-blue-500" style={{ width: `${buyPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">Seller Interest</span>
              <span className="text-sm font-bold text-purple-700">{sellPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full bg-purple-500" style={{ width: `${sellPct}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-xs text-blue-900 font-semibold">📈 Volume & Urgency: {weeklyVolume} requests in last 7 days</p>
        </div>
      </div>
    );
  };

  const MarketIntelligenceCard = () => {
    const totalLowBudget = Object.values(budgetByParish).reduce((sum, b) => sum + b.low, 0);
    const totalRequests = Object.values(serviceRequestData).reduce((a, b) => a + b, 0);
    const lowPct = totalRequests > 0 ? ((totalLowBudget / totalRequests) * 100).toFixed(0) : 0;

    return (
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg shadow-md p-6 text-white border-t-4 border-t-yellow-400">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-yellow-300" />
          <h3 className="text-lg font-bold">What This Data Means</h3>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="bg-white/20 rounded-lg p-3 flex-1">
              <p className="font-semibold text-yellow-300">Budget Reality</p>
              <p className="text-white">{lowPct}% of all requests are low-budget</p>
              <p className="text-blue-100 text-xs mt-1">Agents expect high-commission luxury but market reality is mass-market</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="bg-white/20 rounded-lg p-3 flex-1">
              <p className="font-semibold text-yellow-300">You Are Not Running a Property Site</p>
              <p className="text-white">You are running a demand intelligence engine</p>
              <p className="text-blue-100 text-xs mt-1">This data is your competitive advantage - use it to guide pricing, supply decisions, and market positioning</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PremiumLockOverlay = ({ children }) => {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm">
          <Lock className="w-8 h-8 text-white mb-2" />
          <p className="text-white font-bold text-sm">Premium Feature</p>
          <p className="text-white/80 text-xs">Unlock with Pro Plan</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading market analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with SEO */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Jamaica Real Estate Market Analytics</h2>
        <p className="text-gray-600 text-lg">Demand intelligence engine - real-time market data insights</p>
        <div className="mt-4 flex gap-3">
          <Link href="/market" className="btn-accent btn-sm">
            View Full Market Report
          </Link>
        </div>
      </div>

      {/* Graphs Grid - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarGraph
          data={visitorData}
          percentages={visitorPercentages}
          title="Visitor Interest by Parish"
          icon={Users}
          color="text-blue-600"
        />

        <BarGraph
          data={serviceRequestData}
          percentages={requestPercentages}
          title="Service Requests by Parish"
          icon={MapPin}
          color="text-green-600"
        />

        <TrendingParishesCard />

        <div className="lg:col-span-2">
          <DemandPricePointGraph />
        </div>

        <UnderservedDemandCard />

        <PremiumLockOverlay>
          <DemandSupplyRatioCard />
        </PremiumLockOverlay>

        <PremiumLockOverlay>
          <BudgetByParishGraph />
        </PremiumLockOverlay>

        <RequestTypeDistributionCard />
      </div>
    </div>
  );
}
