// Role-based access control utility functions

export const ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  LANDLORD: 'landlord',
  USER: 'user'
};

export const AGENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded'
};

/**
 * Check if user has admin role
 */
export function isAdmin(userData) {
  return userData?.role === ROLES.ADMIN;
}

/**
 * Check if user is a verified agent
 */
export function isVerifiedAgent(userData) {
  return userData?.agent?.verification_status === AGENT_STATUS.APPROVED;
}

/**
 * Check if user is a paid agent
 */
export function isPaidAgent(userData) {
  return (
    userData?.agent?.verification_status === AGENT_STATUS.APPROVED &&
    userData?.agent?.payment_status === PAYMENT_STATUS.PAID
  );
}

/**
 * Check if user can post properties
 * - Agents: Must be verified and paid
 * - Regular users: Must have less than 1 property
 */
export function canPostProperty(userData) {
  // Admin can always post
  if (isAdmin(userData)) return true;
  
  // Verified and paid agents can post unlimited
  if (isPaidAgent(userData)) return true;
  
  // Regular users can post 1 property
  return (userData?.property_count || 0) < 1;
}

/**
 * Check if user can view client requests
 * Only verified and paid agents
 */
export function canViewClientRequests(userData) {
  return isAdmin(userData) || isPaidAgent(userData);
}

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(userData) {
  return isAdmin(userData);
}

/**
 * Check if user needs to pay agent fee
 */
export function needsAgentPayment(userData) {
  return (
    userData?.agent?.verification_status === AGENT_STATUS.APPROVED &&
    userData?.agent?.payment_status === PAYMENT_STATUS.UNPAID
  );
}

/**
 * Check if user is waiting for agent verification
 */
export function isAgentPending(userData) {
  return userData?.agent?.verification_status === AGENT_STATUS.PENDING;
}

/**
 * Get user's primary role display name
 */
export function getUserRole(userData) {
  if (isAdmin(userData)) return 'Admin';
  if (isPaidAgent(userData)) return 'Verified Agent';
  if (isVerifiedAgent(userData)) return 'Agent (Pending Payment)';
  if (isAgentPending(userData)) return 'Agent (Pending Verification)';
  if (userData?.agent) return 'Agent (Rejected)';
  return 'User';
}

/**
 * Get features user can access
 */
export function getUserFeatures(userData) {
  const features = {
    viewProperties: true,
    postProperty: canPostProperty(userData),
    viewClientRequests: canViewClientRequests(userData),
    adminDashboard: canAccessAdmin(userData),
    agentDashboard: isVerifiedAgent(userData),
    requestAgent: true,
    manageOwnProperties: true
  };

  return features;
}

/**
 * Get redirect path based on user status
 */
export function getDefaultRedirect(userData) {
  if (isAdmin(userData)) return '/admin/dashboard';
  if (needsAgentPayment(userData)) return '/agent/payment';
  if (isPaidAgent(userData)) return '/agent/dashboard';
  return '/dashboard';
}

/**
 * Block message for feature access
 */
export function getBlockMessage(feature, userData) {
  const messages = {
    postProperty: () => {
      if (userData?.agent?.verification_status === AGENT_STATUS.PENDING) {
        return 'Agent verification pending. You cannot post properties yet.';
      }
      if (needsAgentPayment(userData)) {
        return 'Payment required. Complete your agent payment to post unlimited properties.';
      }
      if ((userData?.property_count || 0) >= 1) {
        return 'Property limit reached. Regular users can post 1 property. Become a verified agent for unlimited postings!';
      }
      return 'You cannot post properties at this time.';
    },
    viewClientRequests: () => {
      if (!userData?.agent) {
        return 'Only verified agents can view client requests.';
      }
      if (isAgentPending(userData)) {
        return 'Agent verification pending. Please wait for admin approval.';
      }
      if (needsAgentPayment(userData)) {
        return 'Payment required to access client requests.';
      }
      return 'You do not have access to client requests.';
    },
    adminDashboard: () => {
      return 'Admin access only.';
    }
  };

  return messages[feature] ? messages[feature]() : 'Access denied.';
}
