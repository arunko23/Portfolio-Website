interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as {
      name: string;
      description?: string;
      lat: number;
      lng: number;
      youtube_url: string;
    };

    const { name, description, lat, lng, youtube_url } = body;

    if (!name || !lat || !lng || !youtube_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, lat, lng, youtube_url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (isNaN(Number(lat)) || isNaN(Number(lng))) {
      return new Response(JSON.stringify({ error: 'lat and lng must be valid numbers' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare(
      `INSERT INTO live_cameras (name, description, lat, lng, youtube_url)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(name, description || null, Number(lat), Number(lng), youtube_url)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to save camera' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
