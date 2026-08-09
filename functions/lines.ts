interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare(
      "SELECT id, name, lat1, lng1, lat2, lng2, created_at FROM ht_lines"
    ).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch lines" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
