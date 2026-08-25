// seed_cables.js - Run this once to generate seed_cables.sql
// Usage: node seed_cables.js
const fs = require('fs');

let data = fs.readFileSync('CablesData.js', 'utf8');
// Strip BOM and variable declaration
data = data.replace(/^\uFEFF/, '').replace(/^\s*const KMZ_CABLES_DATA\s*=\s*/, '').trim();
if (data.endsWith(';')) data = data.slice(0, -1);

const geojson = JSON.parse(data);

// Only keep LineString features — no Point markers/towers
const lines = geojson.features.filter(f => f.geometry && f.geometry.type === 'LineString');

console.log(`Found ${lines.length} LineString features. Generating SQL...`);

const sqlLines = [
  'CREATE TABLE IF NOT EXISTS cable_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, line_group TEXT, coordinates TEXT NOT NULL);',
  ''
];

for (const feature of lines) {
  const name      = (feature.properties?.name  || '').replace(/'/g, "''");
  const group     = (feature.properties?.group || '').replace(/'/g, "''");
  const coords    = JSON.stringify(feature.geometry.coordinates).replace(/'/g, "''");
  sqlLines.push(`INSERT INTO cable_lines (name, line_group, coordinates) VALUES ('${name}', '${group}', '${coords}');`);
}

fs.writeFileSync('seed_cables.sql', sqlLines.join('\n'), 'utf8');
console.log(`Done! seed_cables.sql written with ${lines.length} rows.`);
console.log(`File size: ${(fs.statSync('seed_cables.sql').size / 1024).toFixed(1)} KB`);
