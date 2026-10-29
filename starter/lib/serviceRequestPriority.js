const URGENCY_PRIORITY = { high: 1, urgent: 2 };

export function compareServiceRequestPriority(a, b) {
  const priorityDifference =
    (URGENCY_PRIORITY[b.urgency] || 0) - (URGENCY_PRIORITY[a.urgency] || 0);
  return priorityDifference || new Date(b.created_at) - new Date(a.created_at);
}
