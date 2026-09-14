interface Env {
  DB: D1Database;
}

// PATCH /toggle-camera  → { id, is_active }  toggle on/off
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const { id, is_active } = await request.json() as { id: number; is_active: number };
    await env.DB.prepare(`UPDATE live_cameras SET is_active = ? WHERE id = ?`)
      .bind(is_active, id)
      .run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Update failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /toggle-camera?id=X  → hard-delete the row
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    await env.DB.prepare(`DELETE FROM live_cameras WHERE id = ?`).bind(id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Delete failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
