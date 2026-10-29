const PAYPAL_ORDER_API = '/v2/checkout/orders';

function getPayPalBaseUrl() {
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function getPayPalCredentials() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured');
  }
  if (
    process.env.PAYPAL_CLIENT_ID &&
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_ID !== process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  ) {
    throw new Error('PayPal client IDs do not match. Use the same PayPal app client ID in both environment variables.');
  }
  return { clientId, clientSecret };
}

async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    console.error('PayPal access token request failed:', result);
    if (response.status === 401) {
      throw new Error('PayPal rejected the server credentials. Check that the client ID and secret belong to the same app and match the configured sandbox or live mode.');
    }
    throw new Error('Unable to connect to PayPal');
  }
  return result.access_token;
}

export async function callPayPal(path, { method = 'GET', body, requestId } = {}) {
  const accessToken = await getPayPalAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  if (requestId) headers['PayPal-Request-Id'] = requestId;

  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    console.error('PayPal API request failed:', {
      status: response.status,
      response: result,
    });
    const message = response.status === 401
      ? 'PayPal rejected the server credentials. Check that the client ID and secret belong to the same app and match the configured sandbox or live mode.'
      : 'PayPal could not process this payment request';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return result;
}

export { PAYPAL_ORDER_API };
