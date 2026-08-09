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
    await env.DB.prepare("DELETE FROM ht_lines WHERE id = ?").bind(parseInt(id)).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete line" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
