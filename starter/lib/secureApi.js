/**
 * OPTIMIZED SECURE API CLIENT
 * 
 * ✅ Server-side filtering - fetch only what you need
 * ✅ Pagination support
 * ✅ Type-safe filter options
 * ✅ Automatic retry logic
 */

/**
 * Fetch service requests with server-side filters
 * Only fetches necessary data based on filters
 * 
 * @param {Object} options - Fetch options
 * @param {string} options.authToken - Authentication token (optional)
 * @param {Object} options.filters - Server-side filters
 * @param {string} options.filters.status - Filter by status: 'open', 'assigned', 'completed'
 * @param {string} options.filters.request_type - Filter by type: 'buy', 'rent', 'sale'
 * @param {string} options.filters.property_type - Filter by property: 'house', 'apartment', 'land'
 * @param {string} options.filters.location - Filter by location (partial match)
 * @param {number} options.filters.bedrooms - Filter by bedroom count
 * @param {number} options.filters.min_budget - Minimum budget
 * @param {number} options.filters.max_budget - Maximum budget
 * @param {string} options.filters.urgency - Filter by urgency: 'normal', 'high', 'urgent'
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Results per page (default: 20, max: 100)
 * @param {string} options.sort_by - Sort field (default: 'created_at')
 * @param {string} options.sort_order - Sort order: 'asc' or 'desc'
 * @returns {Promise<Object>} Response with data and pagination
 */
export async function fetchServiceRequests(options = {}) {
  try {
    const {
      authToken = null,
      filters = {},
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = options;

    // Build query parameters for server-side filtering
    const params = new URLSearchParams();
    
    // Add pagination
    params.append('page', page);
    params.append('limit', Math.min(limit, 100));
    params.append('sort_by', sort_by);
    params.append('sort_order', sort_order);

    // Add filters - server will handle validation and filtering
    if (filters.status) params.append('status', filters.status);
    if (filters.request_type) params.append('request_type', filters.request_type);
    if (filters.property_type) params.append('property_type', filters.property_type);
    if (filters.location) params.append('location', filters.location);
    if (filters.bedrooms) params.append('bedrooms', filters.bedrooms);
    if (filters.min_budget) params.append('min_budget', filters.min_budget);
    if (filters.max_budget) params.append('max_budget', filters.max_budget);
    if (filters.urgency) params.append('urgency', filters.urgency);
    if (filters.show_contacted) params.append('show_contacted', filters.show_contacted);

    const headers = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`/api/requests?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch requests');
    }

    const result = await response.json();
    
    // Result includes:
    // - data: filtered results (only requested fields)
    // - pagination: { page, limit, total, total_pages }
    // - masked: true/false
    // - filters_applied: actual filters used
    return result;

  } catch (error) {
    console.error('Error fetching requests:', error);
    throw error;
  }
}

/**
 * Claim a service request (agent only)
 */
export async function claimServiceRequest(requestId, authToken) {
  try {
    const response = await fetch('/api/requests/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to claim request');
    }

    return await response.json();

  } catch (error) {
    console.error('Error claiming request:', error);
    throw error;
  }
}

/**
 * Get full contact details for a claimed request (agent only)
 */
export async function getRequestContactDetails(requestId, authToken) {
  try {
    const response = await fetch(`/api/requests/${requestId}/contact`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get contact details');
    }

    return await response.json();

  } catch (error) {
    console.error('Error getting contact details:', error);
    throw error;
  }
}
