// weight-balance.js — AS350 B3e Weight & Balance (Figure 1/3) Plotter & Geometry Engine

document.addEventListener('DOMContentLoaded', () => {
  // ---- Chart Geometry Constants (from AMM Figure 1/3) ----
  const CHART = {
    imageWidth: 1150,
    imageHeight: 910,
    plotLeft: 270,
    plotRight: 1138,
    plotTop: 267,
    plotBottom: 785,
    tickTopY: 248,
    tickBottomY: 802,
    drawLeft: 268,
    drawRight: 1139,
    drawTop: 240,
    drawBottom: 812,
    weightMin: 1000,
    weightMax: 1600,
    cgMin: 3300,
    cgMax: 3650,
  };

  const TOP_CG = [
    [3350, 380], [3360, 401], [3370, 423], [3380, 445], [3390, 467],
    [3400, 488], [3410, 510], [3420, 532], [3430, 553], [3440, 574],
    [3450, 596], [3460, 617], [3470, 639], [3480, 661], [3490, 683],
    [3500, 705], [3532, 769], [3550, 812], [3565, 856], [3600, 920], [3650, 1029],
  ];

  const BOTTOM_CG = [
    [3350, 313], [3360, 349], [3370, 383], [3380, 418], [3390, 453],
    [3400, 488], [3410, 523], [3420, 557], [3430, 592], [3440, 628],
    [3450, 662], [3460, 698], [3470, 732], [3480, 767], [3490, 800],
    [3500, 837], [3532, 940], [3550, 1011], [3565, 1083], [3600, 1186], [3650, 1366],
  ];

  const WEIGHT_Y = [
    [1000, 267], [1025, 289], [1050, 310], [1075, 332], [1100, 354],
    [1119.5, 369], [1125, 375], [1150, 397], [1175, 418], [1200, 439],
    [1225, 461], [1250, 482], [1275, 504], [1300, 525], [1325, 548],
    [1350, 569], [1375, 591], [1400, 611], [1425, 634], [1450, 655],
    [1475, 677], [1500, 697], [1525, 719], [1550, 741], [1575, 762], [1600, 785],
  ];

  const LB_PER_KG = 2.2046226218;
  const MM_PER_IN = 25.4;

  function kgToLb(kg) { return kg * LB_PER_KG; }
  function lbToKg(lb) { return lb / LB_PER_KG; }
  function mmToIn(mm) { return mm / MM_PER_IN; }
  function inToMm(inches) { return inches * MM_PER_IN; }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function interp(table, v) {
    if (table.length < 2) return table[0] ? table[0][1] : 0;
    if (v <= table[0][0]) {
      const a = table[0], b = table[1];
      return a[1] + ((v - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
    }
    for (let i = 0; i < table.length - 1; i++) {
      if (v <= table[i + 1][0]) {
        const a = table[i], b = table[i + 1];
        return a[1] + ((v - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
      }
    }
    const a = table[table.length - 2], b = table[table.length - 1];
    return a[1] + ((v - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
  }

  function invertInterp(table, px) {
    const swapped = table.map(([v, p]) => [p, v]);
    const increasing = swapped[swapped.length - 1][0] >= swapped[0][0];
    const ordered = increasing ? swapped : [...swapped].reverse();
    return interp(ordered, px);
  }

  function topX(cgMm) { return interp(TOP_CG, cgMm); }
  function bottomX(cgMm) { return interp(BOTTOM_CG, cgMm); }
  function yOfWeight(weightKg) { return interp(WEIGHT_Y, weightKg); }
  function weightOfY(y) { return invertInterp(WEIGHT_Y, y); }

  function xAtY(cgMm, y) {
    const t = (y - CHART.plotTop) / (CHART.plotBottom - CHART.plotTop);
    return topX(cgMm) + t * (bottomX(cgMm) - topX(cgMm));
  }

  function pos(weightKg, cgMm) {
    const y = yOfWeight(weightKg);
    return { x: xAtY(cgMm, y), y: y };
  }

  function cgLine(cgMm) {
    return {
      top: { x: xAtY(cgMm, CHART.tickTopY), y: CHART.tickTopY },
      bottom: { x: xAtY(cgMm, CHART.tickBottomY), y: CHART.tickBottomY },
    };
  }

  function noBallastLeftX(y) {
    const t = Math.max(0, Math.min(1, (y - 350) / (700 - 350)));
    return 813 + 99 * t + 10 * t * (1 - t);
  }

  function noBallastRightX(y) {
    const t = Math.max(0, Math.min(1, (y - 350) / (700 - 350)));
    return 850 + 220 * t + 7 * t * (1 - t);
  }

  function isNoBallast(x, y) {
    return x >= noBallastLeftX(y) && x <= noBallastRightX(y);
  }

  function pointZone(pt) {
    return isNoBallast(pt.x, pt.y) ? "NO BALLAST" : "BALLAST";
  }

  function inPlotBox(x, y) {
    return x >= CHART.plotLeft && x <= CHART.plotRight && y >= CHART.plotTop && y <= CHART.plotBottom;
  }

  function inChartRange(weightKg, cgMm) {
    const pt = pos(weightKg, cgMm);
    return weightKg >= CHART.weightMin && weightKg <= CHART.weightMax && inPlotBox(pt.x, pt.y);
  }

  function reverse(x, y) {
    const weightKg = weightOfY(y);
    let lo = CHART.cgMin;
    let hi = CHART.cgMax;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (pos(weightKg, mid).x < x) lo = mid;
      else hi = mid;
    }
    return { weightKg, cgMm: (lo + hi) / 2 };
  }

  function neighbouringMarks(cgMm) {
    const marks = [...new Set([...TOP_CG.map(([v]) => v), ...BOTTOM_CG.map(([v]) => v)])].sort((a, b) => a - b);
    if (marks.some((m) => Math.abs(m - cgMm) < 1e-6)) return null;
    if (cgMm <= marks[0] || cgMm >= marks[marks.length - 1]) return null;
    for (let i = 0; i < marks.length - 1; i++) {
      if (cgMm > marks[i] && cgMm < marks[i + 1]) {
        return { left: marks[i], right: marks[i + 1] };
      }
    }
    return null;
  }

  // ---- Overlay Styling Palette ----
  const OVERLAY = {
    plot: "#C1272D",
    halo: "#FFFFFF",
    connect: "#1B3A4B",
    cross: "#5B6068",
    ink: "#1C2128",
  };

  // ---- State ----
  let points = [];
  let nextId = 1;
  let currentZoom = 1.0;

  // ---- DOM Elements ----
  const chartImg = document.getElementById("chartImg");
  const plotCanvas = document.getElementById("plotCanvas");
  const plotStage = document.getElementById("plotStage");
  const viewport = document.getElementById("viewport");

  const inputWeight = document.getElementById("inputWeight");
  const weightUnit = document.getElementById("weightUnit");
  const inputCg = document.getElementById("inputCg");
  const cgUnit = document.getElementById("cgUnit");
  const formError = document.getElementById("formError");

  const btnPlot = document.getElementById("btnPlot");
  const btnClearLast = document.getElementById("btnClearLast");
  const btnClearAll = document.getElementById("btnClearAll");
  const btnExport = document.getElementById("btnExport");
  const btnPrint = document.getElementById("btnPrint");

  const chkConnect = document.getElementById("chkConnect");
  const chkCrosshair = document.getElementById("chkCrosshair");
  const chkCgLine = document.getElementById("chkCgLine");
  const chkReadMode = document.getElementById("chkReadMode");
  const coordsReadout = document.getElementById("coordsReadout");
  const readoutText = document.getElementById("readoutText");

  const statusCard = document.getElementById("statusCard");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusTitle = document.getElementById("statusTitle");
  const statusDesc = document.getElementById("statusDesc");
  const statusDetails = document.getElementById("statusDetails");

  const pointsTableBody = document.getElementById("pointsTableBody");
  const pointsCount = document.getElementById("pointsCount");
  const emptyTableMsg = document.getElementById("emptyTableMsg");

  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const zoomReset = document.getElementById("zoomReset");
  const zoomLevel = document.getElementById("zoomLevel");

  // ---- Unit Switching Handlers ----
  weightUnit.addEventListener("change", () => {
    let val = parseFloat(inputWeight.value);
    if (!isNaN(val)) {
      if (weightUnit.value === "lb") {
        inputWeight.value = kgToLb(val).toFixed(1);
        inputWeight.min = kgToLb(CHART.weightMin).toFixed(1);
        inputWeight.max = kgToLb(CHART.weightMax).toFixed(1);
      } else {
        inputWeight.value = lbToKg(val).toFixed(1);
        inputWeight.min = CHART.weightMin;
        inputWeight.max = CHART.weightMax;
      }
    }
  });

  cgUnit.addEventListener("change", () => {
    let val = parseFloat(inputCg.value);
    if (!isNaN(val)) {
      if (cgUnit.value === "in") {
        inputCg.value = mmToIn(val).toFixed(3);
        inputCg.step = "0.001";
        inputCg.min = mmToIn(CHART.cgMin).toFixed(3);
        inputCg.max = mmToIn(CHART.cgMax).toFixed(3);
      } else {
        inputCg.value = inToMm(val).toFixed(1);
        inputCg.step = "0.1";
        inputCg.min = CHART.cgMin;
        inputCg.max = CHART.cgMax;
      }
    }
  });

  // ---- Helper: Get Normalized Inputs ----
  function getNormalizedInputs() {
    const rawW = parseFloat(inputWeight.value);
    const rawC = parseFloat(inputCg.value);
    if (isNaN(rawW) || isNaN(rawC)) {
      return { valid: false, error: "Please enter valid numeric weight and CG values." };
    }
    const weightKg = weightUnit.value === "lb" ? lbToKg(rawW) : rawW;
    const cgMm = cgUnit.value === "in" ? inToMm(rawC) : rawC;

    if (!inChartRange(weightKg, cgMm)) {
      return {
        valid: false,
        error: `Coordinates (${weightKg.toFixed(1)} kg, ${cgMm.toFixed(1)} mm) are outside the plotted chart envelope (1000–1600 kg, 3300–3650 mm).`,
      };
    }
    return {
      valid: true,
      rawWeight: rawW,
      weightUnit: weightUnit.value,
      rawCg: rawC,
      cgUnit: cgUnit.value,
      weightKg,
      cgMm,
    };
  }

  // ---- Update Status Card ----
  function updateStatusCard() {
    const last = points.length > 0 ? points[points.length - 1] : null;

    statusCard.classList.remove("status-ballast", "status-noballast", "status-none");

    if (!last) {
      statusCard.classList.add("status-none");
      statusIndicator.textContent = "●";
      statusTitle.textContent = "No Point Plotted";
      statusDesc.textContent = "Enter aircraft weight and CG to plot on Figure 1/3 and verify ballast requirements.";
      statusDetails.innerHTML = "";
      return;
    }

    const pt = pos(last.weightKg, last.cgMm);
    const zone = pointZone(pt);
    const isBallast = zone === "BALLAST";

    statusCard.classList.add(isBallast ? "status-ballast" : "status-noballast");
    statusIndicator.textContent = isBallast ? "✓" : "▲";
    statusTitle.textContent = isBallast ? "BALLAST ZONE" : "NO BALLAST ZONE";
    statusDesc.textContent = isBallast
      ? "Plotted point lies within the Ballast Zone. Verify ballast weight requirements according to flight manual procedures."
      : "Plotted point is within the normal flight envelope with No Ballast Required.";

    const neighbours = neighbouringMarks(last.cgMm);
    let markNote = "";
    if (neighbours) {
      const pct = (((last.cgMm - neighbours.left) / (neighbours.right - neighbours.left)) * 100).toFixed(1);
      markNote = `Line sits between printed <strong>${neighbours.left} mm</strong> and <strong>${neighbours.right} mm</strong> marks (${pct}% of span).`;
    } else {
      markNote = `Line is locked to printed <strong>${last.cgMm.toFixed(1)} mm</strong> mark from bottom to top scale.`;
    }

    statusDetails.innerHTML = `
      <dl class="status-dl">
        <dt>Latest Plotted</dt>
        <dd>Point #${last.id}</dd>
        <dt>Gross Weight</dt>
        <dd>${last.weightKg.toFixed(1)} kg (${kgToLb(last.weightKg).toFixed(1)} lb)</dd>
        <dt>Center of Gravity</dt>
        <dd>${last.cgMm.toFixed(1)} mm (${mmToIn(last.cgMm).toFixed(3)} in)</dd>
      </dl>
      <div style="margin-top:6px; font-size:11px; color:var(--ink-soft);">${markNote}</div>
    `;
  }

  // ---- Update Points Table ----
  function updatePointsTable() {
    pointsCount.textContent = `(${points.length} point${points.length === 1 ? "" : "s"})`;
    if (points.length === 0) {
      pointsTableBody.innerHTML = "";
      emptyTableMsg.style.display = "block";
      return;
    }

    emptyTableMsg.style.display = "none";
    pointsTableBody.innerHTML = points
      .map((p) => {
        const pt = pos(p.weightKg, p.cgMm);
        const zone = pointZone(pt);
        const badgeClass = zone === "BALLAST" ? "badge-ballast" : "badge-noballast";
        return `
        <tr>
          <td><strong>P${p.id}</strong></td>
          <td>${p.weightKg.toFixed(1)} kg</td>
          <td>${kgToLb(p.weightKg).toFixed(1)} lb</td>
          <td>${p.cgMm.toFixed(1)} mm</td>
          <td>${mmToIn(p.cgMm).toFixed(3)} in</td>
          <td><span class="badge-zone ${badgeClass}">${zone}</span></td>
          <td><button type="button" class="del-point-btn" data-id="${p.id}" title="Delete point P${p.id}">✕</button></td>
        </tr>
      `;
      })
      .join("");

    // Attach delete listeners
    document.querySelectorAll(".del-point-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"), 10);
        points = points.filter((p) => p.id !== id);
        if (points.length === 0) nextId = 1;
        updateStatusCard();
        updatePointsTable();
        drawCanvas();
      });
    });
  }

  // ---- Canvas Drawing Engine ----
  function drawCanvas() {
    const w = CHART.imageWidth;
    const h = CHART.imageHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    plotCanvas.width = Math.round(w * dpr);
    plotCanvas.height = Math.round(h * dpr);
    const ctx = plotCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const connect = chkConnect.checked;
    const crosshair = chkCrosshair.checked;
    const showCgLine = chkCgLine.checked;

    function haloStroke(drawFn, color, width, haloW) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = OVERLAY.halo;
      ctx.lineWidth = haloW || width + 3.2;
      ctx.globalAlpha = 0.92;
      drawFn();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = 1;
      drawFn();
      ctx.restore();
    }

    // 1. Connect points in order
    if (connect && points.length > 1) {
      ctx.save();
      ctx.setLineDash([10, 6]);
      haloStroke(
        () => {
          ctx.beginPath();
          const first = pos(points[0].weightKg, points[0].cgMm);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < points.length; i++) {
            const p = pos(points[i].weightKg, points[i].cgMm);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        },
        OVERLAY.connect,
        2.4,
        5.4
      );
      ctx.restore();
    }

    // 2. CG construction + horizontal weight lines
    if (showCgLine) {
      // Slope for "parallel to 01, 02..." = slope of 3350 mm line (up-right)
      const refTopX = topX(3350);
      const refBotX = bottomX(3350);
      const refDy = CHART.plotBottom - CHART.plotTop;
      const refDx = refBotX - refTopX;
      const parallelSlope = refDx / refDy;

      const seen = new Set();
      for (const p of points) {
        const key = p.cgMm.toFixed(3);
        if (seen.has(key)) continue;
        seen.add(key);

        const pt = pos(p.weightKg, p.cgMm);
        const line = cgLine(p.cgMm);

        // Lower segment: bottom tick -> plotted point
        haloStroke(
          () => {
            ctx.beginPath();
            ctx.moveTo(line.bottom.x, line.bottom.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          },
          OVERLAY.plot,
          2.4,
          5.4
        );

        // Upper segment: from plotted point upward, parallel to 01/02 lines (up-right)
        const dyUp = CHART.tickTopY - pt.y;
        const dxUp = parallelSlope * dyUp;
        const topX2 = pt.x + dxUp;
        haloStroke(
          () => {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(topX2, CHART.tickTopY);
            ctx.stroke();
          },
          OVERLAY.plot,
          2.4,
          5.4
        );
      }

      // Horizontal weight line continues rightward across the chart
      for (const p of points) {
        const pt = pos(p.weightKg, p.cgMm);
        haloStroke(
          () => {
            ctx.beginPath();
            ctx.moveTo(CHART.plotLeft, pt.y);
            ctx.lineTo(CHART.plotRight, pt.y);
            ctx.stroke();
          },
          OVERLAY.plot,
          1.6,
          4.0
        );
      }
    }

    // 3. Plotted Points & optional crosshairs
    for (const p of points) {
      const pt = pos(p.weightKg, p.cgMm);
      if (crosshair) {
        ctx.save();
        ctx.setLineDash([7, 6]);
        haloStroke(
          () => {
            ctx.beginPath();
            ctx.moveTo(CHART.plotLeft, pt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          },
          OVERLAY.cross,
          1.4,
          3.6
        );
        ctx.restore();
      }

      // Circular Point Marker
      ctx.save();
      ctx.fillStyle = OVERLAY.halo;
      ctx.strokeStyle = OVERLAY.ink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = OVERLAY.plot;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Point Label (P1, P2...)
      ctx.fillStyle = OVERLAY.ink;
      ctx.font = "bold 12px 'JetBrains Mono', Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = OVERLAY.halo;
      ctx.lineWidth = 3.2;
      ctx.strokeText(`P${p.id}`, pt.x, pt.y - 14);
      ctx.fillText(`P${p.id}`, pt.x, pt.y - 14);
      ctx.restore();
    }
  }

  // ---- Form Submission & Point Adding ----
  document.getElementById("plotForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const result = getNormalizedInputs();
    if (!result.valid) {
      formError.textContent = result.error;
      formError.style.display = "block";
      return;
    }
    formError.style.display = "none";

    points.push({
      id: nextId++,
      rawWeight: result.rawWeight,
      weightUnit: result.weightUnit,
      rawCg: result.rawCg,
      cgUnit: result.cgUnit,
      weightKg: result.weightKg,
      cgMm: result.cgMm,
    });

    updateStatusCard();
    updatePointsTable();
    drawCanvas();
  });

  // ---- Button Handlers ----
  btnClearLast.addEventListener("click", () => {
    points.pop();
    if (points.length === 0) nextId = 1;
    formError.style.display = "none";
    updateStatusCard();
    updatePointsTable();
    drawCanvas();
  });

  btnClearAll.addEventListener("click", () => {
    points = [];
    nextId = 1;
    formError.style.display = "none";
    updateStatusCard();
    updatePointsTable();
    drawCanvas();
  });

  btnExport.addEventListener("click", () => {
    if (points.length === 0) {
      alert("No points to export. Plot at least one point first.");
      return;
    }
    const rows = [
      ["Point", "Weight_Entered", "Weight_Unit", "Weight_kg", "Weight_lb", "CG_Entered", "CG_Unit", "CG_mm", "CG_inch", "Zone"],
    ];
    for (const p of points) {
      const pt = pos(p.weightKg, p.cgMm);
      rows.push([
        `P${p.id}`,
        String(p.rawWeight),
        p.weightUnit,
        p.weightKg.toFixed(2),
        kgToLb(p.weightKg).toFixed(2),
        String(p.rawCg),
        p.cgUnit,
        p.cgMm.toFixed(2),
        mmToIn(p.cgMm).toFixed(3),
        pointZone(pt),
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `AS350_B3e_Weight_Balance_Points_${Date.now()}.csv`;
    a.click();
  });

  btnPrint.addEventListener("click", () => {
    window.print();
  });

  // ---- Toggles ----
  [chkConnect, chkCrosshair, chkCgLine].forEach((cb) => {
    cb.addEventListener("change", drawCanvas);
  });

  chkReadMode.addEventListener("change", () => {
    const active = chkReadMode.checked;
    plotCanvas.style.cursor = active ? "crosshair" : "default";
    coordsReadout.style.display = active ? "block" : "none";
  });

  // ---- Canvas Hover & Click Reading ----
  plotCanvas.addEventListener("mousemove", (e) => {
    if (!chkReadMode.checked && !chkCrosshair.checked) return;
    const r = plotCanvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * CHART.imageWidth) / r.width;
    const y = ((e.clientY - r.top) * CHART.imageHeight) / r.height;

    if (inPlotBox(x, y)) {
      const rev = reverse(x, y);
      const zone = pointZone({ x, y });
      readoutText.innerHTML = `<strong>${rev.weightKg.toFixed(1)} kg</strong> (${kgToLb(rev.weightKg).toFixed(1)} lb) · <strong>${rev.cgMm.toFixed(1)} mm</strong> (${mmToIn(rev.cgMm).toFixed(3)} in) · <span style="font-weight:700; color:${zone === "BALLAST" ? "var(--green)" : "#8A4E00"}">${zone}</span>`;
    } else {
      readoutText.textContent = "Cursor outside graph area";
    }
  });

  plotCanvas.addEventListener("click", (e) => {
    if (!chkReadMode.checked) return;
    const r = plotCanvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * CHART.imageWidth) / r.width;
    const y = ((e.clientY - r.top) * CHART.imageHeight) / r.height;

    if (inPlotBox(x, y)) {
      const rev = reverse(x, y);
      if (weightUnit.value === "lb") {
        inputWeight.value = kgToLb(rev.weightKg).toFixed(1);
      } else {
        inputWeight.value = rev.weightKg.toFixed(1);
      }

      if (cgUnit.value === "in") {
        inputCg.value = mmToIn(rev.cgMm).toFixed(3);
      } else {
        inputCg.value = rev.cgMm.toFixed(1);
      }
      formError.style.display = "none";
    }
  });

  // ---- Zoom Controls ----
  function applyZoom(z) {
    currentZoom = clamp(z, 0.4, 2.5);
    plotStage.style.width = `${Math.round(CHART.imageWidth * currentZoom)}px`;
    plotStage.style.height = `${Math.round(CHART.imageHeight * currentZoom)}px`;
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
    drawCanvas();
  }

  function fitZoom() {
    const vpW = viewport.clientWidth - 40;
    const fit = Math.min(1.0, Math.max(0.4, vpW / CHART.imageWidth));
    applyZoom(fit);
  }

  zoomIn.addEventListener("click", () => applyZoom(currentZoom + 0.15));
  zoomOut.addEventListener("click", () => applyZoom(currentZoom - 0.15));
  zoomReset.addEventListener("click", fitZoom);

  // ---- Initial Setup & Image Load ----
  function init() {
    fitZoom();
    updateStatusCard();
    updatePointsTable();
    drawCanvas();
  }

  if (chartImg.complete) {
    init();
  } else {
    chartImg.onload = init;
  }

  window.addEventListener("resize", () => {
    drawCanvas();
  });
});
