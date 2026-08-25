interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const locationId = url.searchParams.get("location_id");

  try {
    let query = `
      SELECT 
        s.id, 
        s.location_id,
        l.name as location_name,
        l.lat,
        l.lng,
        s.pic, 
        o.name as obstacle_risk, 
        b.name as burnout_risk, 
        a.name as animal_risk, 
        se.name as security_risk,
        si.name as size_risk,
        s.remarks, 
        s.image_url, 
        s.created_at
      FROM submissions s
      JOIN locations l ON s.location_id = l.id
      JOIN risks o ON s.obstacle_risk_id = o.id
      JOIN risks b ON s.burnout_risk_id = b.id
      JOIN risks a ON s.animal_risk_id = a.id
      JOIN risks se ON s.security_risk_id = se.id
      JOIN risks si ON s.size_risk_id = si.id
    `;
    
    let stmt;
    if (locationId) {
      query += " WHERE s.location_id = ?";
      stmt = env.DB.prepare(query).bind(locationId);
    } else {
      stmt = env.DB.prepare(query);
    }

    const { results } = await stmt.all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch submissions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
