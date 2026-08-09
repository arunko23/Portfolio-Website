interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const lat1 = parseFloat(formData.get("lat1") as string);
    const lng1 = parseFloat(formData.get("lng1") as string);
    const lat2 = parseFloat(formData.get("lat2") as string);
    const lng2 = parseFloat(formData.get("lng2") as string);

    if (!name || isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await env.DB.prepare(
      "INSERT INTO ht_lines (name, lat1, lng1, lat2, lng2) VALUES (?, ?, ?, ?, ?) RETURNING id"
    )
      .bind(name, lat1, lng1, lat2, lng2)
      .first<{ id: number }>();

    return new Response(
      JSON.stringify({ success: true, id: result!.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Failed to save high tension line" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
