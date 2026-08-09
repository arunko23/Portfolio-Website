interface Env {
  DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id || isNaN(parseInt(id))) {
    return new Response(JSON.stringify({ error: "Missing or invalid id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(parseInt(id)).run();
    // Also clean up the location row (it's unique per submission in this app)
    await env.DB.prepare(
      "DELETE FROM locations WHERE id NOT IN (SELECT location_id FROM submissions)"
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete submission" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
