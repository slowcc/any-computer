const RATE_LIMIT = 50;
const RATE_LIMIT_PERIOD = 60 * 60; // 1 hour in seconds

export async function onRequest(context) {
  const { request, env } = context;

  // Handle OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  const clientIP = request.headers.get('CF-Connecting-IP');
  if (!clientIP) {
    return new Response('Unable to determine client IP', { status: 400 });
  }

  // Check rate limit
  const rateLimitKey = `ratelimit:${clientIP}`;
  const currentCount = parseInt(await env.RLKV.get(rateLimitKey) || '0', 10);

  if (currentCount >= RATE_LIMIT) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Increment the request count
  await env.RLKV.put(rateLimitKey, (currentCount + 1).toString(), { expirationTtl: RATE_LIMIT_PERIOD });

  const url = new URL(request.url);
  const apiKey = env.GOOGLE_API_KEY;

  // Replace or append the API key in the original search parameters
  url.searchParams.set('key', apiKey);

  // Construct the new URL for the Google API, maintaining the original search parameters
  const apiUrl = new URL('https://generativelanguage.googleapis.com/v1beta' + url.pathname.replace('/gemini/', '/') + url.search);

  // Clone the original request with the updated URL
  const newRequest = new Request(apiUrl, request);

  // Forward the request to the Google API
  const response = await fetch(newRequest);

  // Clone the response and add CORS headers
  const newResponse = new Response(response.body, response);
  return addCORSHeaders(newResponse);
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(),
  });
}

function addCORSHeaders(response) {
  const headers = getCORSHeaders();
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

function getCORSHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
}
