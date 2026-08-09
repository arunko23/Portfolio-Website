// This middleware intercepts all requests to /functions and adds CORS headers
export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Pass request to the next handler
  const response = await next();

  // Add CORS headers to the response
  const corsHeaders = new Headers(response.headers);
  corsHeaders.set("Access-Control-Allow-Origin", "*");
  corsHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  corsHeaders.set("Access-Control-Allow-Headers", "Content-Type");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders,
  });
};
