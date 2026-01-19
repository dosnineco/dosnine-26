import React from 'react';
import { PRICING_PLANS, BUDGET_RANGES, getPlanStatus, formatBudget } from '../lib/pricingPlans';

export function AutoAssignModal({
  open,
  agents,
  agentId,
  count,
  includeBuys,
  loading,
  onClose,
  onSubmit,
  onAgentChange,
  onCountChange,
  onIncludeBuysChange,
  budgetMin = 10000,
  budgetMax = 100000000,
  onBudgetMinChange,
  onBudgetMaxChange,
}) {
  if (!open) return null;

  const selectedAgent = agents.find((a) => a.id === agentId);
  const planStatus = selectedAgent
    ? getPlanStatus(selectedAgent.payment_status, selectedAgent.access_expiry)
    : null;
  const plan = selectedAgent ? PRICING_PLANS[selectedAgent.payment_status] : null;

  // Handle budget slider changes
  const handleMinChange = (e) => {
    const sliderVal = Number(e.target.value);
    const newBudget = Math.pow(10, sliderVal);
    if (newBudget < budgetMax && onBudgetMinChange) {
      onBudgetMinChange(newBudget);
    }
  };

  const handleMaxChange = (e) => {
    const sliderVal = Number(e.target.value);
    const newBudget = Math.pow(10, sliderVal);
    if (newBudget > budgetMin && onBudgetMaxChange) {
      onBudgetMaxChange(newBudget);
    }
  };

  const safeBudgetMax = budgetMax === Infinity ? 100000000 : budgetMax;
  const safeBudgetMin = Math.max(10000, budgetMin);
  const minSliderValue = Math.log10(safeBudgetMin);
  const maxSliderValue = Math.log10(safeBudgetMax);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl my-8">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Auto Assign Requests</h3>
            <p className="text-sm text-gray-500">Assign oldest open requests to a selected agent.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
          {/* Agent Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Select Agent</label>
            <select
              value={agentId}
              onChange={(e) => onAgentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            >
              <option value="">Choose an agent...</option>
              {agents.map((agent) => {
                const status = getPlanStatus(agent.payment_status, agent.access_expiry);
                return (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name} — {agent.email} ({agent.payment_status})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Agent Plan Details */}
          {selectedAgent && plan && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: planStatus.color }}
                  >
                    {planStatus.label}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{plan.price}</p>
                  <p className="text-xs text-gray-600">{plan.duration}</p>
                </div>
              </div>

              {/* Plan Features */}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Access Details:</p>
                <ul className="space-y-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className={feature.included ? '✓ text-green-600' : '— text-gray-400'}>
                        {feature.included ? '✓' : '—'}
                      </span>
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Budget Range Slider */}
          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-800">Budget Range Filter</label>
            <p className="text-xs text-gray-600">
              Filter requests between {formatBudget(budgetMin)} and {formatBudget(budgetMax)}
            </p>

            {/* Dual Slider */}
            <div className="pt-2">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Minimum: {formatBudget(budgetMin)}</label>
                  <input
                    type="range"
                    min="4"
                    max="8"
                    step="0.1"
                    value={minSliderValue}
                    onChange={handleMinChange}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Maximum: {formatBudget(budgetMax)}</label>
                  <input
                    type="range"
                    min="4"
                    max="8"
                    step="0.1"
                    value={maxSliderValue}
                    onChange={handleMaxChange}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Budget Presets */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Quick Presets:</p>
              <div className="grid grid-cols-2 gap-2">
                {BUDGET_RANGES.map((range, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (onBudgetMinChange) onBudgetMinChange(range.min);
                      if (onBudgetMaxChange) onBudgetMaxChange(range.max);
                    }}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-medium"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Number to assign</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => onCountChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
              />
              <p className="text-xs text-gray-500">Oldest open requests assigned first</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Include buys</label>
              <div className="flex items-center gap-2 h-[42px]">
                <input
                  id="include-buys"
                  type="checkbox"
                  checked={includeBuys}
                  onChange={(e) => onIncludeBuysChange(e.target.checked)}
                  className="h-4 w-4 text-accent focus:ring-accent border-gray-300 rounded"
                />
                <label htmlFor="include-buys" className="text-sm text-gray-700">
                  Allow buy requests
                </label>
              </div>
              <p className="text-xs text-gray-500">Checked = buyer leads included</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !agentId}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--accent-color-hover)] hover:text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Assigning...' : 'Assign Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AutoAssignModal;
