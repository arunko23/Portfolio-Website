interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Fetch all cable lines from D1
    const { results } = await env.DB.prepare(
      'SELECT id, name, line_group, coordinates FROM cable_lines'
    ).all<{ id: number; name: string; line_group: string; coordinates: string }>();

    // Convert rows back to GeoJSON FeatureCollection — only LineStrings, no points/towers
    const features = results.map((row) => ({
      type: 'Feature',
      properties: {
        name:  row.name  || '',
        group: row.line_group || '',
      },
      geometry: {
        type:        'LineString',
        coordinates: JSON.parse(row.coordinates),
      },
    }));

    const geojson = {
      type:     'FeatureCollection',
      features,
    };

    return new Response(JSON.stringify(geojson), {
      headers: {
        'Content-Type': 'application/json',
        // Cache for 1 hour on the CDN since this data rarely changes
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch cable lines:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch cable lines' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
