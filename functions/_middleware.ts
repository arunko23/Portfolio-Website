export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;

  // Ensure any case variation like /Training or trailing slash redirects to /training
  const url = new URL(request.url);
  const normalizedPath = url.pathname.toLowerCase().replace(/\/+$/, "");
  if (normalizedPath === "/training" && url.pathname !== "/training") {
    return Response.redirect(`${url.origin}/training${url.search}`, 301);
  }

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
