// chart.js — AS350 B2 Engine Power Check Chart Plotter & Geometry Engine

const CHART = {
  width: 596,
  height: 847,
  left: 84,
  right: 507,
  topY: 21,
  topBottom: 284,
  midTop: 295,
  midBottom: 531,
  botTop: 542,
  botBottom: 661,
};

const TQ_AT_394 = [
  [50, 477],
  [55, 447],
  [60, 417],
  [65, 386],
  [70, 356],
  [75, 325],
  [80, 297],
  [85, 264],
  [90, 233],
  [95, 204],
];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function yOAT(oat) {
  return CHART.topBottom - ((oat + 30) * (CHART.topBottom - CHART.topY)) / 80;
}

function yNR(nr) {
  return CHART.botBottom - ((nr - 380) * (CHART.botBottom - CHART.botTop)) / 20;
}

function yPA(pa) {
  return CHART.midBottom - (pa / 5000) * 98;
}

function lerpTable(table, v) {
  if (v <= table[0][0]) {
    const [v0, x0] = table[0];
    const [v1, x1] = table[1];
    return x0 + ((x1 - x0) * (v - v0)) / (v1 - v0);
  }
  for (let i = 0; i < table.length - 1; i++) {
    if (v <= table[i + 1][0]) {
      const [v0, x0] = table[i];
      const [v1, x1] = table[i + 1];
      return x0 + ((x1 - x0) * (v - v0)) / (v1 - v0);
    }
  }
  const n = table.length;
  const [v0, x0] = table[n - 2];
  const [v1, x1] = table[n - 1];
  return x0 + ((x1 - x0) * (v - v0)) / (v1 - v0);
}

function xTorqueAt394(tq) {
  return lerpTable(TQ_AT_394, tq);
}

function xBottom(nr, tq) {
  const y394 = yNR(394);
  return xTorqueAt394(tq) + 0.24 * (yNR(nr) - y394);
}

function xOnPolyline(p, y, extrapPx = 0) {
  if (!p || !p.x || p.x.length < 2) return null;
  if (y < p.y0 - extrapPx || y > p.y1 + extrapPx) return null;
  if (y < p.y0) {
    const dx = p.x[1] - p.x[0];
    return p.x[0] + dx * (y - p.y0);
  }
  if (y > p.y1) {
    const n = p.x.length;
    const dx = p.x[n - 1] - p.x[n - 2];
    return p.x[n - 1] + dx * (y - p.y1);
  }
  const t = y - p.y0;
  const i = Math.floor(t);
  const f = t - i;
  if (i >= p.x.length - 1) return p.x[p.x.length - 1];
  if (i < 0) return p.x[0];
  return p.x[i] * (1 - f) + p.x[i + 1] * f;
}

function interpolateVs(pts, v) {
  if (!pts || pts.length === 0) return CHART.left;
  const sorted = [...pts].sort((a, b) => a[0] - b[0]);
  if (sorted.length === 1) return sorted[0][1];
  if (v <= sorted[0][0]) {
    const [v0, x0] = sorted[0];
    const [v1, x1] = sorted[1];
    const den = v1 - v0 || 1;
    return x0 + ((x1 - x0) * (v - v0)) / den;
  }
  const last = sorted.length - 1;
  if (v >= sorted[last][0]) {
    const [v0, x0] = sorted[last - 1];
    const [v1, x1] = sorted[last];
    const den = v1 - v0 || 1;
    return x0 + ((x1 - x0) * (v - v0)) / den;
  }
  for (let i = 0; i < last; i++) {
    if (v <= sorted[i + 1][0]) {
      const [v0, x0] = sorted[i];
      const [v1, x1] = sorted[i + 1];
      const den = v1 - v0 || 1;
      return x0 + ((x1 - x0) * (v - v0)) / den;
    }
  }
  return sorted[last][1];
}

function xNG(ng, oat) {
  const y = yOAT(oat);
  const pts = [];
  const curves = window.NG_CURVES || [];
  for (const c of curves) {
    const x = xOnPolyline(c, y, 24);
    if (x != null) pts.push([c.ng, x]);
  }
  return interpolateVs(pts, ng);
}

function ngBracket(ng) {
  const curves = window.NG_CURVES || [];
  const ngs = curves.map((c) => c.ng).sort((a, b) => a - b);
  if (ngs.length < 2) return { lo: 96, hi: 97 };
  if (ng <= ngs[0]) return { lo: ngs[0], hi: ngs[1] };
  if (ng >= ngs[ngs.length - 1]) return { lo: ngs[ngs.length - 2], hi: ngs[ngs.length - 1] };
  for (let i = 0; i < ngs.length - 1; i++) {
    if (ng >= ngs[i] && ng <= ngs[i + 1]) return { lo: ngs[i], hi: ngs[i + 1] };
  }
  return { lo: 96, hi: 97 };
}

function midFamilyIndex(bottomX) {
  const pts = [];
  const curves = window.MID_CURVES || [];
  curves.forEach((c, i) => {
    const x = xOnPolyline(c, CHART.midBottom, 4);
    if (x != null) pts.push([i, x]);
  });
  const sorted = [...pts].sort((a, b) => a[1] - b[1]);
  if (sorted.length < 2) return 0;
  if (bottomX <= sorted[0][1]) {
    const [i0, x0] = sorted[0];
    const [i1, x1] = sorted[1];
    return i0 + ((i1 - i0) * (bottomX - x0)) / (x1 - x0 || 1);
  }
  if (bottomX >= sorted[sorted.length - 1][1]) {
    const [i0, x0] = sorted[sorted.length - 2];
    const [i1, x1] = sorted[sorted.length - 1];
    return i0 + ((i1 - i0) * (bottomX - x0)) / (x1 - x0 || 1);
  }
  for (let k = 0; k < sorted.length - 1; k++) {
    if (bottomX <= sorted[k + 1][1]) {
      const [i0, x0] = sorted[k];
      const [i1, x1] = sorted[k + 1];
      return i0 + ((i1 - i0) * (bottomX - x0)) / (x1 - x0 || 1);
    }
  }
  return sorted[sorted.length - 1][0];
}

function xMiddleAtY(familyIndex, y) {
  const pts = [];
  const curves = window.MID_CURVES || [];
  curves.forEach((c, i) => {
    const x = xOnPolyline(c, y, 0);
    if (x != null && x > 86) pts.push([i, x]);
  });
  return interpolateVs(pts, familyIndex);
}

function xMiddle(bottomX, pa) {
  return xMiddleAtY(midFamilyIndex(bottomX), yPA(pa));
}

function middleConstructionPath(bottomX, pa) {
  const s = midFamilyIndex(bottomX);
  const yTop = yPA(pa);
  const pts = [];
  const y0 = CHART.midBottom;
  const y1 = Math.min(y0, Math.max(CHART.midTop, yTop));
  const step = y1 <= y0 ? -1 : 1;
  for (let y = y0; step < 0 ? y >= y1 : y <= y1; y += step) {
    pts.push({ x: xMiddleAtY(s, y), y });
  }
  if (pts.length === 0 || pts[pts.length - 1].y !== yTop) {
    pts.push({ x: xMiddleAtY(s, yTop), y: yTop });
  }
  return pts;
}

function boundaryY(x) {
  return 72 + 0.5 * (x - CHART.left);
}

function finalClass(mx, fy) {
  return fy >= boundaryY(mx) ? 'CORRECT' : 'INCORRECT';
}

function calculatePlot(nr, tq, pa, ng, oat) {
  const by = yNR(nr);
  const bx = xBottom(nr, tq);
  const my = yPA(pa);
  const midPath = middleConstructionPath(bx, pa);
  const mx = midPath.length ? midPath[midPath.length - 1].x : xMiddle(bx, pa);
  const oy = yOAT(oat);
  const gx = xNG(ng, oat);
  const fy = boundaryY(gx);
  const cls = finalClass(mx, fy);
  const { lo: ngLo, hi: ngHi } = ngBracket(ng);
  return { nr, tq, pa, ng, oat, bx, by, mx, my, gx, oy, fy, cls, midPath, ngLo, ngHi };
}

// ── Canvas Drawing Helpers ──
const BLUE = '#1457D9';
const RED = '#C41212';
const GREEN = '#138A4A';

function drawLine(ctx, x1, y1, x2, y2, color, w = 2.5, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.setLineDash(dash);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawDot(ctx, x, y, color, fill = true) {
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.fillStyle = fill ? color : '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  if (!fill) ctx.stroke();
  ctx.restore();
}

function drawText(ctx, s, x, y, color = '#111', size = 13, align = 'left') {
  ctx.save();
  ctx.font = `600 ${size}px 'Inter', Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 3;
  ctx.strokeText(s, x, y);
  ctx.fillText(s, x, y);
  ctx.restore();
}

function renderPlotOnCanvas(ctx, p, showLabels) {
  ctx.clearRect(0, 0, CHART.width, CHART.height);
  if (!p) return;

  const { nr, tq, pa, ng, oat, bx, by, mx, my, gx, oy, fy, cls, midPath } = p;
  const good = cls === 'CORRECT';

  // 1. Bottom Section: NR line across to Torque intersection
  drawLine(ctx, CHART.left, by, bx, by, BLUE, 2.4, [9, 6]);
  // Vertical transfer up to middle section
  drawLine(ctx, bx, by, bx, CHART.midBottom, RED, 2.8);

  // 2. Middle Section: Curve path up to PA altitude
  if (midPath.length > 1) {
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(midPath[0].x, midPath[0].y);
    for (let i = 1; i < midPath.length; i++) ctx.lineTo(midPath[i].x, midPath[i].y);
    ctx.stroke();
    ctx.restore();
  }

  // Horizontal guide line from altitude axis to curve intersection
  drawLine(ctx, CHART.left, my, mx, my, BLUE, 2.4, [9, 6]);
  // Vertical line straight up through top section
  drawLine(ctx, mx, my, mx, CHART.topY, RED, 2.8);

  // 3. Top Section: OAT horizontal guide across to Ng curve intersection
  drawLine(ctx, CHART.left, oy, gx, oy, BLUE, 2.4, [9, 6]);
  // Vertical down to boundary reference line
  drawLine(ctx, gx, oy, gx, fy, BLUE, 2.8);
  // Horizontal line across to vertical transfer line
  drawLine(ctx, gx, fy, mx, fy, good ? GREEN : RED, 3.0);

  // Dots at key intersection points
  drawDot(ctx, bx, by, RED);
  drawDot(ctx, mx, my, RED);
  drawDot(ctx, gx, oy, BLUE);
  drawDot(ctx, gx, fy, good ? GREEN : RED);
  drawDot(ctx, mx, fy, good ? GREEN : RED, false);

  if (!showLabels) return;
  drawText(ctx, String(nr), CHART.left - 10, by - 4, BLUE, 20, 'right');
  drawText(ctx, String(tq) + '%', bx + 8, CHART.botBottom + 16, RED, 18, 'left');
  drawText(ctx, pa.toLocaleString() + ' ft', CHART.left - 10, my, BLUE, 20, 'right');
  drawText(ctx, String(ng), gx + 14, oy - 20, BLUE, 20, 'left');
  drawText(ctx, (oat >= 0 ? '+' : '') + String(oat) + '°C', CHART.left - 10, oy, BLUE, 20, 'right');

  // ── Draw conditions in the CONDITIONS box (bottom-left of chart) ──
  const condItems = [
    { label: 'NR',  value: `${nr} RPM` },
    { label: 'TQ',  value: `${tq}%` },
    { label: 'PA',  value: `${pa.toLocaleString()} ft` },
    { label: 'NG',  value: `${ng.toFixed(1)}` },
    { label: 'OAT', value: `${oat >= 0 ? '+' : ''}${oat}°C` },
  ];
  const dashY = [706, 718, 729, 739, 750];
  condItems.forEach((item, i) => {
    drawText(ctx, `${item.label}: ${item.value}`, 48, dashY[i], '#111', 11.5, 'left');
  });

  // ── Draw result in the ENGINE POWER CHECK box (bottom-right of chart) ──
  drawText(ctx, good ? '✓ CORRECT' : '✕ INCORRECT', 440, 762, good ? GREEN : RED, 18, 'center');
}

// ── Application UI & Event Wireup ──
document.addEventListener('DOMContentLoaded', () => {
  const sliderNr  = document.getElementById('sliderNr');
  const sliderTq  = document.getElementById('sliderTq');
  const sliderPa  = document.getElementById('sliderPa');
  const sliderNg  = document.getElementById('sliderNg');
  const sliderOat = document.getElementById('sliderOat');

  const statusCard      = document.getElementById('statusCard');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusTitle     = document.getElementById('statusTitle');
  const statusDesc      = document.getElementById('statusDesc');
  const statusDetails   = document.getElementById('statusDetails');

  const chkLabels    = document.getElementById('chkLabels');
  const chkCrosshair = document.getElementById('chkCrosshair');
  const coordsReadout = document.getElementById('coordsReadout');
  const readoutText  = document.getElementById('readoutText');

  const btnReset  = document.getElementById('btnReset');
  const btnExport = document.getElementById('btnExport');
  const btnPrint  = document.getElementById('btnPrint');

  const plotStage  = document.getElementById('plotStage');
  const plotCanvas = document.getElementById('plotCanvas');
  const ctx        = plotCanvas.getContext('2d');

  const zoomIn    = document.getElementById('zoomIn');
  const zoomOut   = document.getElementById('zoomOut');
  const zoomReset = document.getElementById('zoomReset');
  const zoomLevel = document.getElementById('zoomLevel');

  let currentZoom = 1.0;
  let currentPlot = null;

  function updateValuesAndPlot() {
    const nr  = parseFloat(sliderNr.value)  || 394;
    const tq  = parseFloat(sliderTq.value)  || 80;
    const pa  = parseFloat(sliderPa.value)  || 0;
    const ng  = parseFloat(sliderNg.value)  || 97.5;
    const oat = parseFloat(sliderOat.value) || 0;

    currentPlot = calculatePlot(nr, tq, pa, ng, oat);
    renderPlotOnCanvas(ctx, currentPlot, chkLabels.checked);
    updateStatusBadge(currentPlot);
  }

  function updateStatusBadge(p) {
    statusCard.classList.remove('status-correct', 'status-incorrect');
    if (p.cls === 'CORRECT') {
      statusCard.classList.add('status-correct');
      statusIndicator.textContent = '✓';
      statusTitle.textContent = 'CORRECT · Power Check OK';
      statusDesc.textContent = 'Engine power output meets or exceeds flight manual minimum performance criteria.';
    } else {
      statusCard.classList.add('status-incorrect');
      statusIndicator.textContent = '✕';
      statusTitle.textContent = 'INCORRECT · Check Failed';
      statusDesc.textContent = 'Engine performance is below the minimum specification limit. Investigate before flight.';
    }

    const ngNote = p.ng !== p.ngLo && p.ng !== p.ngHi
      ? `NG ${p.ng} is interpolated between ${p.ngLo} and ${p.ngHi} curves`
      : `NG ${p.ng} is locked to the printed ${p.ng} curve`;

    statusDetails.innerHTML = `
      Result: <strong>${p.cls}</strong><br>
      ${ngNote}<br>
      Transfer X: ${p.mx.toFixed(1)}px · Boundary Y: ${p.fy.toFixed(1)}px
    `;
  }

  // Range inputs live update
  [sliderNr, sliderTq, sliderPa, sliderNg, sliderOat].forEach(slider => {
    slider.addEventListener('input', updateValuesAndPlot);
  });

  chkLabels.addEventListener('change', () => {
    if (currentPlot) renderPlotOnCanvas(ctx, currentPlot, chkLabels.checked);
  });

  // Crosshair inspector
  chkCrosshair.addEventListener('change', () => {
    const active = chkCrosshair.checked;
    plotCanvas.style.cursor = active ? 'crosshair' : 'default';
    coordsReadout.style.display = active ? 'block' : 'none';
  });

  plotCanvas.addEventListener('click', (e) => {
    if (!chkCrosshair.checked) return;
    const r = plotCanvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * CHART.width) / r.width;
    const y = ((e.clientY - r.top) * CHART.height) / r.height;
    readoutText.textContent = `X: ${Math.round(x)}px, Y: ${Math.round(y)}px`;
  });

  // Reset defaults
  btnReset.addEventListener('click', () => {
    sliderNr.value = 394;
    sliderTq.value = 80;
    sliderPa.value = 5000;
    sliderNg.value = 97.5;
    sliderOat.value = 20;
    updateValuesAndPlot();
  });

  // Export CSV
  btnExport.addEventListener('click', () => {
    if (!currentPlot) return;
    const p = currentPlot;
    const rows = [
      ['NR', 'TQ', 'PA_ft', 'NG', 'OAT_C', 'BottomX_px', 'MiddleX_px', 'NG_OAT_X_px', 'BoundaryY_px', 'Final_Result'],
      [p.nr, p.tq, p.pa, p.ng, p.oat, p.bx.toFixed(2), p.mx.toFixed(2), p.gx.toFixed(2), p.fy.toFixed(2), p.cls]
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `AS350_B2_Engine_Power_Check_${Date.now()}.csv`;
    a.click();
  });

  // Print
  btnPrint.addEventListener('click', () => {
    window.print();
  });

  // Zoom controls
  function applyZoom(z) {
    currentZoom = clamp(z, 0.6, 2.0);
    plotStage.style.width = `${CHART.width * currentZoom}px`;
    plotStage.style.height = `${CHART.height * currentZoom}px`;
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  zoomIn.addEventListener('click', () => applyZoom(currentZoom + 0.15));
  zoomOut.addEventListener('click', () => applyZoom(currentZoom - 0.15));
  zoomReset.addEventListener('click', () => applyZoom(1.0));

  // Initial plot run
  updateValuesAndPlot();
});
