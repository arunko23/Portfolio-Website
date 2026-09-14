interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const showAll = new URL(request.url).searchParams.get('all') === '1';

  const query = showAll
    ? `SELECT id, name, description, lat, lng, youtube_url, is_active, created_at
       FROM live_cameras ORDER BY name ASC`
    : `SELECT id, name, description, lat, lng, youtube_url, is_active, created_at
       FROM live_cameras WHERE is_active = 1 ORDER BY name ASC`;

  const result = await env.DB.prepare(query).all();

  return new Response(JSON.stringify(result.results), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
