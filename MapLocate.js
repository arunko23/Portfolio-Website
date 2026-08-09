// Style Definitions
  const satelliteStyle = {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri'
      },
      'esri-labels': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    },
    layers: [
      { id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 19 },
      { id: 'esri-labels-layer', type: 'raster', source: 'esri-labels', minzoom: 0, maxzoom: 19 }
    ]
  };

  const streetStyle = {
    version: 8,
    sources: {
      'osm-street': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      }
    },
    layers: [
      { id: 'osm-street-layer', type: 'raster', source: 'osm-street', minzoom: 0, maxzoom: 19 }
    ]
  };

  // Initialize MapLibre GL Map
  const map = new maplibregl.Map({
    container: 'map',
    style: satelliteStyle,
    center: [85.4298, 27.6710], // [lng, lat]
    zoom: 12,
    pitch: 0, // 0deg = 2D view
    bearing: 0 // 0deg = North
  });

  // Add standard zoom and compass controls
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }), 'top-left');

  // --- 2D / 3D & COMPASS ORIENTATION LOGIC ---
  const mode2dBtn = document.getElementById('mode2dBtn');
  const mode3dBtn = document.getElementById('mode3dBtn');
  const compassArrow = document.getElementById('compassArrow');
  const northResetBtn = document.getElementById('northResetBtn');

  mode2dBtn.addEventListener('click', () => {
    map.easeTo({ pitch: 0, duration: 800 });
    mode2dBtn.classList.add('active');
    mode3dBtn.classList.remove('active');
  });

  mode3dBtn.addEventListener('click', () => {
    map.easeTo({ pitch: 60, duration: 800 });
    mode3dBtn.classList.add('active');
    mode2dBtn.classList.remove('active');
  });

  // Rotate Compass Arrow when map rotates
  map.on('rotate', () => {
    const bearing = map.getBearing();
    compassArrow.style.transform = `rotate(${-bearing}deg)`;
  });

  // Reset map orientation to North on compass click
  northResetBtn.addEventListener('click', () => {
    map.easeTo({ bearing: 0, duration: 600 });
  });

  // --- MAP LAYER SWITCHING ---
  const layerSatBtn = document.getElementById('layerSatBtn');
  const layerStreetBtn = document.getElementById('layerStreetBtn');

  layerSatBtn.addEventListener('click', () => {
    map.setStyle(satelliteStyle);
    layerSatBtn.classList.add('active');
    layerStreetBtn.classList.remove('active');
    map.once('idle', reapplyHtLayers);
  });

  layerStreetBtn.addEventListener('click', () => {
    map.setStyle(streetStyle);
    layerStreetBtn.classList.add('active');
    layerSatBtn.classList.remove('active');
    map.once('idle', reapplyHtLayers);
  });


  // --- SEARCH & RECOMMENDATIONS JS ---
  const searchLatInput = document.getElementById('searchLat');
  const searchLngInput = document.getElementById('searchLng');
  const searchCoordsBtn = document.getElementById('searchCoordsBtn');
  const placeSearchInput = document.getElementById('placeSearchInput');
  const recommendationsBox = document.getElementById('recommendationsBox');

  searchCoordsBtn.addEventListener('click', function() {
    const lat = parseFloat(searchLatInput.value);
    const lng = parseFloat(searchLngInput.value);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180).');
      return;
    }

    map.flyTo({ center: [lng, lat], zoom: 14 });
    placeTempMarker({ lng, lat }, `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  });

  let debounceTimer = null;
  placeSearchInput.addEventListener('input', function() {
    const query = placeSearchInput.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      recommendationsBox.style.display = 'none';
      recommendationsBox.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
        .then(res => res.json())
        .then(data => {
          recommendationsBox.innerHTML = '';
          if (data.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'recommendation-item';
            emptyItem.style.color = 'var(--ink-soft)';
            emptyItem.textContent = 'No recommendations found';
            recommendationsBox.appendChild(emptyItem);
          } else {
            data.forEach(item => {
              const div = document.createElement('div');
              div.className = 'recommendation-item';
              div.textContent = item.display_name;
              div.addEventListener('click', () => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);

                searchLatInput.value = lat.toFixed(5);
                searchLngInput.value = lon.toFixed(5);
                placeSearchInput.value = item.display_name;
                recommendationsBox.style.display = 'none';

                map.flyTo({ center: [lon, lat], zoom: 14 });
                placeTempMarker({ lng: lon, lat }, `Location: ${item.display_name}`);
              });
              recommendationsBox.appendChild(div);
            });
          }
          recommendationsBox.style.display = 'block';
        })
        .catch(err => {
          console.error('Error fetching recommendations:', err);
        });
    }, 300);
  });

  document.addEventListener('click', function(e) {
    if (!placeSearchInput.contains(e.target) && !recommendationsBox.contains(e.target)) {
      recommendationsBox.style.display = 'none';
    }
  });


  // --- LOGGING & MARKER MANAGEMENT ---
  function riskColor(level){
    if (level === 'High') return '#B23A2E';
    if (level === 'Medium') return '#B98900';
    return '#2E7D4F';
  }
  function overallColor(pin){
    const order = { Low:0, Medium:1, High:2 };
    let max = 'Low';
    [pin.obstacleRisk, pin.burnoutRisk, pin.animalRisk].forEach(r => {
      if (order[r] > order[max]) max = r;
    });
    return riskColor(max);
  }

  let tempMarker = null;
  let pendingLatLng = null;
  let pendingPhoto = null;
  const savedMarkers = {};
  let gpsMarker = null;
  let watchId = null;

  // --- HIGH TENSION LINE STATE ---
  let htLineMode = false;
  let htPointA = null;   // { lat, lng }
  let htPointB = null;   // { lat, lng }
  let htMarkerA = null;
  let htMarkerB = null;
  const savedLines = {}; // id -> { lat1, lng1, lat2, lng2, loggedAt }

  const sharedModeAvailable = !!(window.storage && window.storage.set && window.storage.get && window.storage.list && window.storage.delete);

  async function storeSet(key, value){
    if (sharedModeAvailable){
      const result = await window.storage.set(key, value, true);
      if (!result) throw new Error('Shared storage returned no result.');
      return;
    }
    localStorage.setItem(key, value);
  }
  async function storeGet(key){
    if (sharedModeAvailable){
      const result = await window.storage.get(key, true);
      return result ? result.value : null;
    }
    return localStorage.getItem(key);
  }
  async function storeListKeys(prefix){
    if (sharedModeAvailable){
      const result = await window.storage.list(prefix, true);
      return (result && result.keys) || [];
    }
    const keys = [];
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return keys;
  }
  async function storeDelete(key){
    if (sharedModeAvailable){
      await window.storage.delete(key, true);
      return;
    }
    localStorage.removeItem(key);
  }

  const overlay = document.getElementById('overlay');
  const pinForm = document.getElementById('pinForm');
  const coordsLine = document.getElementById('coordsLine');
  const pinCountEl = document.getElementById('pinCount');
  const emptyNote = document.getElementById('emptyNote');
  const gpsStatus = document.getElementById('gpsStatus');
  const locateBtn = document.getElementById('locateBtn');
  const photoInput = document.getElementById('photo');
  const photoPreview = document.getElementById('photoPreview');

  function updateCount(){
    const n = Object.keys(savedMarkers).length;
    pinCountEl.textContent = n + (n === 1 ? ' point logged' : ' points logged');
    emptyNote.style.display = n === 0 ? 'block' : 'none';
  }
  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function popupHtml(id, pin){
    return `
      <div class="pop-wrap">
        <button type="button" class="pop-close" onclick="this.closest('.maplibregl-popup').remove()" title="Close">✕</button>
        <p class="pop-title">${escapeHtml(pin.sector)}</p>
        <p class="pop-pic">PIC: ${escapeHtml(pin.pic)}</p>
        <div class="risk-row">
          <span class="risk-chip risk-${pin.obstacleRisk.toLowerCase()}">Obstacle ${pin.obstacleRisk}</span>
          <span class="risk-chip risk-${pin.burnoutRisk.toLowerCase()}">Burnout ${pin.burnoutRisk}</span>
          <span class="risk-chip risk-${pin.animalRisk.toLowerCase()}">Animal ${pin.animalRisk}</span>
        </div>
        ${pin.remarks ? `<p class="pop-notes">${escapeHtml(pin.remarks)}</p>` : ''}
        ${pin.photo ? `<img class="pop-photo" src="${pin.photo}" />` : ''}
        <p class="pop-coords">${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}</p>
        <button class="pop-btn pop-btn-del" onclick="deletePin('${id}')">Remove</button>
      </div>
    `;
  }

  function addSavedMarker(id, pin){
    const el = document.createElement('div');
    el.className = 'marker-pin';
    el.style.backgroundColor = overallColor(pin);

    const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(popupHtml(id, pin));
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([pin.lng, pin.lat])
      .setPopup(popup)
      .addTo(map);

    savedMarkers[id] = marker;
  }

  window.deletePin = async function(id){
    try {
      await storeDelete('pins:' + id);
    } catch (e) {
      console.error('Delete failed', e);
      alert('Could not remove this point: ' + e.message);
      return;
    }
    if (savedMarkers[id]){
      savedMarkers[id].remove();
      delete savedMarkers[id];
    }
    updateCount();
  };

  function placeTempMarker(lngLat, label){
    pendingLatLng = { lat: lngLat.lat, lng: lngLat.lng };
    if (tempMarker) tempMarker.remove();

    const el = document.createElement('div');
    el.className = 'temp-marker-pin';

    const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
      <div class="pop-wrap">
        <button type="button" class="pop-close" onclick="closeTempMarker()" title="Close">✕</button>
        <p style="margin:0 0 4px;font-size:13px;color:#5B6068;">${label}</p>
        <p class="pop-coords-inline">${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}</p>
        <button class="pop-btn pop-btn-add" onclick="openPinForm()">Log this point</button>
      </div>
    `);

    tempMarker = new maplibregl.Marker({ element: el })
      .setLngLat([lngLat.lng, lngLat.lat])
      .setPopup(popup)
      .addTo(map);

    tempMarker.togglePopup();
  }

  window.closeTempMarker = function(){
    if (tempMarker) { tempMarker.remove(); tempMarker = null; }
    pendingLatLng = null;
  };

  map.on('click', function(e){
    if (htLineMode){
      handleHtLineClick(e.lngLat);
      return;
    }
    placeTempMarker(e.lngLat, 'Log a hazard point here?');
  });

  window.openPinForm = function(){
    if (!pendingLatLng) return;
    coordsLine.textContent = pendingLatLng.lat.toFixed(5) + ', ' + pendingLatLng.lng.toFixed(5);
    document.getElementById('sector').value = '';
    document.getElementById('pic').value = '';
    document.getElementById('obstacleRisk').value = 'Low';
    document.getElementById('burnoutRisk').value = 'Low';
    document.getElementById('animalRisk').value = 'Low';
    document.getElementById('remarks').value = '';
    photoInput.value = '';
    pendingPhoto = null;
    photoPreview.style.display = 'none';
    overlay.classList.add('open');
  };

  function closeForm(){
    overlay.classList.remove('open');
    if (tempMarker) { tempMarker.remove(); tempMarker = null; }
    pendingLatLng = null;
  }
  document.getElementById('cancelBtn').addEventListener('click', closeForm);

  photoInput.addEventListener('change', function(){
    const file = photoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      const img = new Image();
      img.onload = function(){
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingPhoto = canvas.toDataURL('image/jpeg', 0.6);
        photoPreview.src = pendingPhoto;
        photoPreview.style.display = 'block';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  pinForm.addEventListener('submit', async function(e){
    e.preventDefault();
    if (!pendingLatLng) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
    const pin = {
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      sector: document.getElementById('sector').value.trim() || 'Unnamed sector',
      pic: document.getElementById('pic').value.trim() || 'Unspecified',
      obstacleRisk: document.getElementById('obstacleRisk').value,
      burnoutRisk: document.getElementById('burnoutRisk').value,
      animalRisk: document.getElementById('animalRisk').value,
      remarks: document.getElementById('remarks').value.trim(),
      photo: pendingPhoto,
      loggedAt: Date.now()
    };

    const saveBtn = pinForm.querySelector('.btn-primary');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      await storeSet('pins:' + id, JSON.stringify(pin));
    } catch (err) {
      console.error('Save failed', err);
      alert('Could not save this point: ' + err.message + '\n\nIf this keeps happening, try attaching a smaller photo or removing it.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save point';
      return;
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save point';
    addSavedMarker(id, pin);
    updateCount();
    closeForm();
  });

  async function loadPins(){
    try {
      const keys = await storeListKeys('pins:');
      for (const key of keys) {
        if (savedMarkers[key.replace('pins:', '')]) continue;
        try {
          const val = await storeGet(key);
          if (val) {
            const pin = JSON.parse(val);
            const id = key.replace('pins:', '');
            addSavedMarker(id, pin);
          }
        } catch (innerErr) {
          console.error('Could not load point', key, innerErr);
        }
      }
      const liveIds = new Set(keys.map(k => k.replace('pins:', '')));
      for (const id of Object.keys(savedMarkers)) {
        if (!liveIds.has(id)) {
          savedMarkers[id].remove();
          delete savedMarkers[id];
        }
      }
    } catch (e) {
      console.error('Load failed', e);
      gpsStatus.textContent = 'Could not load points — check your connection.';
    }
    updateCount();
  }

  setInterval(loadPins, 20000);

  function updateGpsMarker(lat, lng){
    if (!gpsMarker){
      const el = document.createElement('div');
      el.className = 'gps-marker-pin';

      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(`
        <div>
          <p style="margin:0 0 8px;font-size:13px;color:#5B6068;">Your current position</p>
          <button class="pop-btn pop-btn-add" onclick="logCurrentGpsPoint()">Log this point</button>
        </div>
      `);

      gpsMarker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);
    } else {
      gpsMarker.setLngLat([lng, lat]);
    }
  }

  window.logCurrentGpsPoint = function(){
    if (!gpsMarker) return;
    const lngLat = gpsMarker.getLngLat();
    placeTempMarker({ lng: lngLat.lng, lat: lngLat.lat }, 'Log a hazard point at your current position?');
    openPinForm();
  };

  locateBtn.addEventListener('click', function(){
    if (!navigator.geolocation){
      gpsStatus.textContent = 'GPS not supported on this device.';
      return;
    }
    locateBtn.disabled = true;
    gpsStatus.textContent = 'Getting your position…';

    navigator.geolocation.getCurrentPosition(function(pos){
      const { latitude, longitude, accuracy } = pos.coords;
      updateGpsMarker(latitude, longitude);
      map.flyTo({ center: [longitude, latitude], zoom: 15 });
      gpsStatus.textContent = 'Live location active — accuracy ~' + Math.round(accuracy) + 'm';
      locateBtn.disabled = false;

      if (watchId === null){
        watchId = navigator.geolocation.watchPosition(function(p){
          updateGpsMarker(p.coords.latitude, p.coords.longitude);
          gpsStatus.textContent = 'Live location active — accuracy ~' + Math.round(p.coords.accuracy) + 'm';
        }, function(err){
          gpsStatus.textContent = 'Live tracking paused: ' + err.message;
        }, { enableHighAccuracy: true, maximumAge: 2000 });
      }
    }, function(err){
      locateBtn.disabled = false;
      gpsStatus.textContent = 'Could not get location: ' + err.message;
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  // --- HIGH TENSION LINE LOGIC ---
  const htLineModeBtn = document.getElementById('htLineModeBtn');
  const htLinePanel = document.getElementById('htLinePanel');
  const htHint = document.getElementById('htHint');
  const htLatA = document.getElementById('htLatA');
  const htLngA = document.getElementById('htLngA');
  const htLatB = document.getElementById('htLatB');
  const htLngB = document.getElementById('htLngB');
  const htLineName = document.getElementById('htLineName');
  const htDrawBtn = document.getElementById('htDrawBtn');
  const htSaveBtn = document.getElementById('htSaveBtn');
  const htCancelBtn = document.getElementById('htCancelBtn');
  const lineCountEl = document.getElementById('lineCount');

  function ensureHtMapLayers(){
    if (!map.getSource('ht-lines-source')){
      map.addSource('ht-lines-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getLayer('ht-lines-layer')){
      map.addLayer({
        id: 'ht-lines-layer',
        type: 'line',
        source: 'ht-lines-source',
        paint: { 'line-color': '#B23A2E', 'line-width': 4 }
      });
      map.on('click', 'ht-lines-layer', function(e){
        const f = e.features[0];
        const id = f.properties.id;
        const line = savedLines[id];
        if (!line) return;
        new maplibregl.Popup({ offset: 8, closeButton: false })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="pop-wrap">
              <button type="button" class="pop-close" onclick="this.closest('.maplibregl-popup').remove()" title="Close">✕</button>
              <p class="pop-title" style="font-size:14.5px;">${escapeHtml(line.name && line.name.trim() ? line.name : 'High tension line')}</p>
              <p class="pop-coords-inline">A: ${line.lat1.toFixed(5)}, ${line.lng1.toFixed(5)}</p>
              <p class="pop-coords-inline" style="margin-bottom:8px;">B: ${line.lat2.toFixed(5)}, ${line.lng2.toFixed(5)}</p>
              <button class="pop-btn pop-btn-del" onclick="deleteHtLine('${id}')">Remove</button>
            </div>
          `)
          .addTo(map);
      });
      map.on('mouseenter', 'ht-lines-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'ht-lines-layer', () => { map.getCanvas().style.cursor = ''; });
    }
    redrawSavedLinesOnMap();
  }

  function redrawSavedLinesOnMap(){
    const src = map.getSource('ht-lines-source');
    if (!src) return;
    const features = Object.keys(savedLines).map(id => {
      const l = savedLines[id];
      return {
        type: 'Feature',
        properties: { id },
        geometry: { type: 'LineString', coordinates: [[l.lng1, l.lat1], [l.lng2, l.lat2]] }
      };
    });
    src.setData({ type: 'FeatureCollection', features });
  }

  // Custom raster styles fully replace the style on setStyle(), so re-add our line layer/source afterwards.
  function reapplyHtLayers(){
    ensureHtMapLayers();
    // If a line is mid-draw (not yet saved), redraw its preview + point markers too.
    if (htPointA && htPointB){
      drawPreviewLine();
    }
  }
  map.on('styledata', function(){
    if (!map.isStyleLoaded()) return;
    if (!map.getSource('ht-lines-source')) reapplyHtLayers();
  });

  function makeHtPointMarker(label, lngLat){
    const el = document.createElement('div');
    el.className = 'ht-point-marker';
    el.textContent = label;
    return new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
  }

  function updateLinesCount(){
    const n = Object.keys(savedLines).length;
    lineCountEl.textContent = n + (n === 1 ? ' line logged' : ' lines logged');
  }

  function clearHtDrawing(){
    if (htMarkerA) { htMarkerA.remove(); htMarkerA = null; }
    if (htMarkerB) { htMarkerB.remove(); htMarkerB = null; }
    htPointA = null;
    htPointB = null;
    htLatA.value = ''; htLngA.value = '';
    htLatB.value = ''; htLngB.value = '';
    htLineName.value = '';
    htSaveBtn.style.display = 'none';
    const src = map.getSource('ht-preview-source');
    if (src) src.setData({ type: 'FeatureCollection', features: [] });
    htHint.textContent = 'Click two points on the map, or type in both points\' coordinates below, then draw the line.';
  }

  function drawPreviewLine(){
    if (!map.getSource('ht-preview-source')){
      map.addSource('ht-preview-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'ht-preview-layer',
        type: 'line',
        source: 'ht-preview-source',
        paint: { 'line-color': '#B23A2E', 'line-width': 3, 'line-dasharray': [2, 1.5] }
      });
    }
    if (!htPointA || !htPointB) return;
    map.getSource('ht-preview-source').setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [[htPointA.lng, htPointA.lat], [htPointB.lng, htPointB.lat]] }
      }]
    });
    htSaveBtn.style.display = 'inline-block';
    htHint.textContent = 'Line drawn — save it to log this high tension line, or cancel to discard.';
  }

  function handleHtLineClick(lngLat){
    if (!htPointA){
      htPointA = { lat: lngLat.lat, lng: lngLat.lng };
      htLatA.value = lngLat.lat.toFixed(5);
      htLngA.value = lngLat.lng.toFixed(5);
      if (htMarkerA) htMarkerA.remove();
      htMarkerA = makeHtPointMarker('A', [lngLat.lng, lngLat.lat]);
      htHint.textContent = 'Point A set. Now click the second point on the map (point B).';
    } else if (!htPointB){
      htPointB = { lat: lngLat.lat, lng: lngLat.lng };
      htLatB.value = lngLat.lat.toFixed(5);
      htLngB.value = lngLat.lng.toFixed(5);
      if (htMarkerB) htMarkerB.remove();
      htMarkerB = makeHtPointMarker('B', [lngLat.lng, lngLat.lat]);
      drawPreviewLine();
    } else {
      // Both points already set — start over with a fresh point A
      clearHtDrawing();
      handleHtLineClick(lngLat);
    }
  }

  htLineModeBtn.addEventListener('click', function(){
    htLineMode = !htLineMode;
    htLineModeBtn.classList.toggle('active', htLineMode);
    htLinePanel.classList.toggle('open', htLineMode);
    if (htLineMode){
      if (tempMarker) { tempMarker.remove(); tempMarker = null; }
      ensureHtMapLayers();
    } else {
      clearHtDrawing();
    }
  });

  htDrawBtn.addEventListener('click', function(){
    const lat1 = parseFloat(htLatA.value), lng1 = parseFloat(htLngA.value);
    const lat2 = parseFloat(htLatB.value), lng2 = parseFloat(htLngB.value);
    if ([lat1, lng1, lat2, lng2].some(isNaN) || lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 || lng1 < -180 || lng1 > 180 || lng2 < -180 || lng2 > 180){
      alert('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180) for both points.');
      return;
    }
    if (htMarkerA) htMarkerA.remove();
    if (htMarkerB) htMarkerB.remove();
    htPointA = { lat: lat1, lng: lng1 };
    htPointB = { lat: lat2, lng: lng2 };
    htMarkerA = makeHtPointMarker('A', [lng1, lat1]);
    htMarkerB = makeHtPointMarker('B', [lng2, lat2]);
    ensureHtMapLayers();
    drawPreviewLine();
    const bounds = new maplibregl.LngLatBounds([lng1, lat1], [lng1, lat1]).extend([lng2, lat2]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
  });

  htSaveBtn.addEventListener('click', async function(){
    if (!htPointA || !htPointB) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const line = {
      name: htLineName.value.trim(),
      lat1: htPointA.lat, lng1: htPointA.lng,
      lat2: htPointB.lat, lng2: htPointB.lng,
      loggedAt: Date.now()
    };
    htSaveBtn.disabled = true;
    htSaveBtn.textContent = 'Saving…';
    try {
      await storeSet('lines:' + id, JSON.stringify(line));
    } catch (err) {
      console.error('Save failed', err);
      alert('Could not save this line: ' + err.message);
      htSaveBtn.disabled = false;
      htSaveBtn.textContent = 'Save high tension line';
      return;
    }
    htSaveBtn.disabled = false;
    htSaveBtn.textContent = 'Save high tension line';
    savedLines[id] = line;
    redrawSavedLinesOnMap();
    updateLinesCount();
    clearHtDrawing();
  });

  htCancelBtn.addEventListener('click', clearHtDrawing);

  window.deleteHtLine = async function(id){
    try {
      await storeDelete('lines:' + id);
    } catch (e) {
      console.error('Delete failed', e);
      alert('Could not remove this line: ' + e.message);
      return;
    }
    delete savedLines[id];
    redrawSavedLinesOnMap();
    updateLinesCount();
    const openPopup = document.querySelector('.maplibregl-popup');
    if (openPopup) openPopup.remove();
  };

  async function loadLines(){
    try {
      const keys = await storeListKeys('lines:');
      for (const key of keys) {
        const id = key.replace('lines:', '');
        if (savedLines[id]) continue;
        try {
          const val = await storeGet(key);
          if (val) savedLines[id] = JSON.parse(val);
        } catch (innerErr) {
          console.error('Could not load line', key, innerErr);
        }
      }
      const liveIds = new Set(keys.map(k => k.replace('lines:', '')));
      for (const id of Object.keys(savedLines)) {
        if (!liveIds.has(id)) delete savedLines[id];
      }
      redrawSavedLinesOnMap();
    } catch (e) {
      console.error('Load lines failed', e);
    }
    updateLinesCount();
  }

  setInterval(loadLines, 20000);

  map.on('load', function(){
    ensureHtMapLayers();
    loadPins();
    loadLines();
  });