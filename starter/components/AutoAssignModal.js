import React from 'react';

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
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-xl">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Auto Assign Requests</h3>
            <p className="text-sm text-gray-500">Assign oldest open requests to a selected agent.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Agent</label>
            <select
              value={agentId}
              onChange={(e) => onAgentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.full_name} — {agent.email}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">Number to assign</label>
              <input
                type="number"
                min={1}
                value={count}
                onChange={(e) => onCountChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
              />
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
                <label htmlFor="include-buys" className="text-sm text-gray-700">Allow buy requests</label>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">Oldest open requests are selected first. Buy requests are skipped unless allowed.</p>
        </div>

        <div className="p-5 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[var(--accent-color-hover)] hover:text-black font-semibold disabled:opacity-60"
          >
            {loading ? 'Assigning...' : 'Assign Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AutoAssignModal;
