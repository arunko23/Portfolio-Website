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
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }), 'bottom-left');

  // --- FLOATING CONTROL PANEL (responsive show/hide) ---
  const panelToggleBtn = document.getElementById('panelToggleBtn');
  const controlPanel = document.getElementById('controlPanel');
  const panelBackdrop = document.getElementById('panelBackdrop');
  const panelDragHandle = document.getElementById('panelDragHandle');
  const MOBILE_BREAKPOINT = 720;

  function setPanelOpen(open){
    controlPanel.classList.toggle('collapsed', !open);
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    panelBackdrop.classList.toggle('visible', open && isMobile);
  }
  function isPanelOpen(){
    return !controlPanel.classList.contains('collapsed');
  }
  panelToggleBtn.addEventListener('click', () => setPanelOpen(!isPanelOpen()));
  panelBackdrop.addEventListener('click', () => setPanelOpen(false));
  panelDragHandle.addEventListener('click', () => setPanelOpen(false));

  // Panel starts open on desktop/tablet, collapsed on small screens so the map is visible first.
  setPanelOpen(window.innerWidth > MOBILE_BREAKPOINT);

  // Keep MapLibre's canvas correctly sized as the panel opens/closes and the window resizes.
  window.addEventListener('resize', () => map.resize());
  controlPanel.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'transform') map.resize();
  });

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
    map.once('idle', () => {
      reapplyHtLayers();
      if (typeof reapplyKmzLayers === 'function') reapplyKmzLayers();
    });
  });

  layerStreetBtn.addEventListener('click', () => {
    map.setStyle(streetStyle);
    layerStreetBtn.classList.add('active');
    layerSatBtn.classList.remove('active');
    map.once('idle', () => {
      reapplyHtLayers();
      if (typeof reapplyKmzLayers === 'function') reapplyKmzLayers();
    });
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
    [pin.obstacleRisk, pin.burnoutRisk, pin.animalRisk, pin.securityRisk, pin.sizeRisk].forEach(r => {
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

  // --- RISK NAME → DB ID MAP (matches schema.sql seed: Low=1, Medium=2, High=3) ---
  const RISK_ID = { 'Low': 1, 'Medium': 2, 'High': 3 };

  // --- HT LINE STORAGE (Now API-backed) ---
  // We no longer use lineStore* methods; directly using fetch in handlers.

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

  let activePinnedPopup = null;

  function popupHtml(id, pin){
    return `
      <div class="pop-wrap">
        <button type="button" class="pop-close" onclick="this.closest('.maplibregl-popup').remove()" title="Close">✕</button>
        <p class="pop-title">${escapeHtml(pin.sector)}</p>
        <p class="pop-pic">PIC: ${escapeHtml(pin.pic)}</p>
        <div class="risk-row">
          <span class="risk-chip risk-${pin.obstacleRisk.toLowerCase()}">Obstacle ${pin.obstacleRisk}</span>
          <span class="risk-chip risk-${pin.burnoutRisk.toLowerCase()}">Brownout ${pin.burnoutRisk}</span>
          <span class="risk-chip risk-${pin.animalRisk.toLowerCase()}">Animal ${pin.animalRisk}</span>
          <span class="risk-chip risk-${pin.securityRisk.toLowerCase()}">Security ${pin.securityRisk}</span>
          <span class="risk-chip risk-${pin.sizeRisk.toLowerCase()}">Size ${pin.sizeRisk}</span>
        </div>
        ${pin.remarks ? `<p class="pop-notes">${escapeHtml(pin.remarks)}</p>` : ''}
        ${pin.photo ? `<img class="pop-photo" src="${pin.photo}" />` : ''}
        <p class="pop-coords">${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}</p>
        <!-- <button class="pop-btn pop-btn-del" onclick="deletePin('${id}')">Remove</button> -->
      </div>
    `;
  }

  function addSavedMarker(id, pin){
    const el = document.createElement('div');
    el.className = 'marker-pin';
    el.style.backgroundColor = overallColor(pin);

    const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
      .setLngLat([pin.lng, pin.lat])
      .setHTML(popupHtml(id, pin));

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([pin.lng, pin.lat])
      .addTo(map);

    let isPinned = false;
    let hoverTimer = null;

    function openPopup(){
      clearTimeout(hoverTimer);
      if (!popup.isOpen()){
        popup.addTo(map);
      }
    }

    function scheduleClose(){
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (!isPinned && popup.isOpen()){
          popup.remove();
        }
      }, 250);
    }

    el.addEventListener('mouseenter', openPopup);
    el.addEventListener('mouseleave', scheduleClose);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      isPinned = !isPinned;
      if (isPinned){
        if (activePinnedPopup && activePinnedPopup !== popup){
          activePinnedPopup.remove();
        }
        activePinnedPopup = popup;
        openPopup();
      } else {
        if (activePinnedPopup === popup) activePinnedPopup = null;
        popup.remove();
      }
    });

    popup.on('open', () => {
      const pEl = popup.getElement();
      if (pEl){
        pEl.addEventListener('mouseenter', () => {
          clearTimeout(hoverTimer);
        });
        pEl.addEventListener('mouseleave', scheduleClose);
      }
    });

    popup.on('close', () => {
      if (activePinnedPopup === popup) activePinnedPopup = null;
      isPinned = false;
    });

    marker._popup = popup;
    marker._openPinned = () => {
      isPinned = true;
      if (activePinnedPopup && activePinnedPopup !== popup){
        activePinnedPopup.remove();
      }
      activePinnedPopup = popup;
      openPopup();
    };

    savedMarkers[id] = marker;
  }

  window.deletePin = async function(id){
    try {
      const res = await fetch('/delete-submission?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('HTTP ' + res.status));
      }
    } catch (e) {
      console.error('Delete failed', e);
      alert('Could not remove this point: ' + e.message);
      return;
    }
    if (savedMarkers[id]){
      if (savedMarkers[id]._popup) savedMarkers[id]._popup.remove();
      savedMarkers[id].remove();
      delete savedMarkers[id];
    }
    updateCount();
  };

  // ── LIVE CAMERA MARKERS ──────────────────────────────────────────────────

  function getYouTubeVideoId(rawUrl) {
    if (!rawUrl) return null;
    const str = String(rawUrl).trim();
    const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = str.match(regExp);
    if (match && match[1]) return match[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    return null;
  }

  window.openCameraPopout = function(videoId, rawUrl) {
    const targetUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : rawUrl;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    if (isMobile) {
      // Mobile browsers block popup windows with dimensions. Open cleanly in new tab / YouTube app.
      window.open(targetUrl, '_blank');
    } else {
      const w = 840;
      const h = 520;
      const left = Math.max(0, Math.round((window.screen.width - w) / 2));
      const top = Math.max(0, Math.round((window.screen.height - h) / 2));
      window.open(
        targetUrl,
        'LiveCam_' + (videoId || 'stream'),
        `width=${w},height=${h},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=yes`
      );
    }
  };

  function cameraPopupHtml(cam) {
    const coords = `${cam.lat.toFixed(4)}°N, ${cam.lng.toFixed(4)}°E`;
    const desc = cam.description
      ? `<p class="cam-modal-desc">${escapeHtml(cam.description)}</p>`
      : '';
    const videoId = getYouTubeVideoId(cam.youtube_url);
    const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

    return `
      <div class="cam-modal-wrap">
        <div class="cam-modal-header">
          <div class="cam-live-indicator">
            <span class="cam-live-dot"></span>
            <span class="cam-live-label">LIVE FEED</span>
          </div>
          <button type="button" class="cam-modal-close" onclick="this.closest('.maplibregl-popup').remove()" title="Close">✕</button>
        </div>
        <p class="cam-modal-title">📹 ${escapeHtml(cam.name)}</p>

        <div class="cam-thumb-container" onclick="openCameraPopout('${videoId || ''}', '${escapeHtml(cam.youtube_url)}')" title="Tap to watch live stream">
          ${thumbUrl ? `
            <img src="${thumbUrl}" alt="${escapeHtml(cam.name)}" class="cam-thumb-img" />
          ` : `
            <div class="cam-thumb-placeholder">📹 Live Camera Feed</div>
          `}
          <div class="cam-thumb-overlay">
            <div class="cam-play-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#fff" viewBox="0 0 16 16">
                <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
              </svg>
            </div>
            <span class="cam-play-text">Watch Live Stream</span>
          </div>
        </div>

        ${desc}
        <button type="button" class="cam-popout-btn" onclick="openCameraPopout('${videoId || ''}', '${escapeHtml(cam.youtube_url)}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
          </svg>
          Watch Live Stream
        </button>

        <div class="cam-modal-footer">
          <span class="pop-coords-inline" style="margin:0;">${coords}</span>
          <a href="${escapeHtml(cam.youtube_url)}" target="_blank" rel="noopener noreferrer" class="cam-ext-link" title="Open directly on YouTube">
            YouTube ↗
          </a>
        </div>
      </div>
    `;
  }

  function addCameraMarker(cam) {
    const el = document.createElement('div');
    el.className = 'camera-pin';
    el.title = cam.name;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Live Camera: ' + cam.name);
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="#ffffff" viewBox="0 0 16 16">
        <path d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2z"/>
      </svg>
      <span class="cam-badge-live">LIVE</span>
    `;

    const popup = new maplibregl.Popup({
      className: 'cam-video-popup',
      maxWidth: '380px',
      offset: 22,
      closeButton: false
    })
      .setLngLat([cam.lng, cam.lat]);

    new maplibregl.Marker({ element: el })
      .setLngLat([cam.lng, cam.lat])
      .addTo(map);

    let isPinned = false;
    let hoverTimer = null;

    function openPopup() {
      clearTimeout(hoverTimer);
      if (!popup.isOpen()) {
        popup.setHTML(cameraPopupHtml(cam));
        popup.addTo(map);
      }
    }

    function scheduleClose() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (!isPinned && popup.isOpen()) popup.remove();
      }, 350);
    }

    // Hover events for desktop mouse
    el.addEventListener('mouseenter', openPopup);
    el.addEventListener('mouseleave', scheduleClose);

    function togglePin(e) {
      if (e) {
        e.stopPropagation();
      }
      clearTimeout(hoverTimer);
      isPinned = !isPinned;
      if (isPinned) {
        if (activePinnedPopup && activePinnedPopup !== popup) {
          activePinnedPopup.remove();
        }
        activePinnedPopup = popup;
        popup.setHTML(cameraPopupHtml(cam));
        popup.addTo(map);
      } else {
        if (activePinnedPopup === popup) activePinnedPopup = null;
        popup.remove();
      }
    }

    // Click handler
    el.addEventListener('click', togglePin);

    // Explicit touch handling for mobile devices to prevent map gesture cancellation
    let touchStartPos = null;
    el.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (touchStartPos && e.changedTouches && e.changedTouches[0]) {
        const dx = Math.abs(e.changedTouches[0].clientX - touchStartPos.x);
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartPos.y);
        // Only trigger if user tapped rather than dragging/panning the map
        if (dx < 10 && dy < 10) {
          e.preventDefault();
          togglePin(e);
        }
      }
    }, { passive: false });

    popup.on('open', () => {
      const pEl = popup.getElement();
      if (pEl) {
        pEl.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
        pEl.addEventListener('mouseleave', scheduleClose);
      }
    });

    popup.on('close', () => {
      if (activePinnedPopup === popup) activePinnedPopup = null;
      isPinned = false;
    });
  }

  async function loadCameras() {
    try {
      const res = await fetch('/cameras');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const cameras = await res.json();
      for (const cam of cameras) {
        addCameraMarker(cam);
      }
    } catch (e) {
      console.error('Failed to load live cameras:', e);
    }
  }

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
    document.getElementById('securityRisk').value = 'Low';
    document.getElementById('sizeRisk').value = 'Low';
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
  if (document.getElementById('modalCloseX')) {
    document.getElementById('modalCloseX').addEventListener('click', closeForm);
  }

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

    const sector       = document.getElementById('sector').value.trim() || 'Unnamed sector';
    const pic          = document.getElementById('pic').value.trim() || 'Unspecified';
    const obstacleRisk = document.getElementById('obstacleRisk').value;
    const burnoutRisk  = document.getElementById('burnoutRisk').value;
    const animalRisk   = document.getElementById('animalRisk').value;
    const securityRisk = document.getElementById('securityRisk').value;
    const sizeRisk     = document.getElementById('sizeRisk').value;
    const remarks      = document.getElementById('remarks').value.trim();

    const saveBtn = pinForm.querySelector('.btn-primary');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const fd = new FormData();
      fd.append('sector',           sector);
      fd.append('lat',              String(pendingLatLng.lat));
      fd.append('lng',              String(pendingLatLng.lng));
      fd.append('pic',              pic);
      fd.append('obstacle_risk_id', String(RISK_ID[obstacleRisk] || 1));
      fd.append('burnout_risk_id',  String(RISK_ID[burnoutRisk]  || 1));
      fd.append('animal_risk_id',   String(RISK_ID[animalRisk]   || 1));
      fd.append('security_risk_id', String(RISK_ID[securityRisk] || 1));
      fd.append('size_risk_id',     String(RISK_ID[sizeRisk]     || 1));
      fd.append('remarks',          remarks);

      // Attach photo if one was selected (convert base64 data URL → File blob)
      if (pendingPhoto) {
        const res = await fetch(pendingPhoto);
        const blob = await res.blob();
        fd.append('photo', blob, 'photo.jpg');
      }

      const response = await fetch('/submit', { method: 'POST', body: fd });
      const rawText = await response.text();
      console.log('Submit response status:', response.status, 'body:', rawText);

      let data;
      try { data = JSON.parse(rawText); } catch(_) { data = {}; }

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${rawText.slice(0, 200)}`);
      }

      // Reload from API so the new pin shows with its real DB id
      await loadPins();
    } catch (err) {
      console.error('Save failed', err);
      alert('Could not save this point: ' + err.message);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save point';
      return;
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save point';
    updateCount();
    closeForm();
  });

  async function loadPins(){
    try {
      const res = await fetch('/submissions');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const submissions = await res.json();

      const liveIds = new Set();

      for (const s of submissions) {
        const id = String(s.id);
        liveIds.add(id);
        if (savedMarkers[id]) continue; // already on map

        const pin = {
          lat:          s.lat,
          lng:          s.lng,
          sector:       s.location_name,
          pic:          s.pic,
          obstacleRisk: s.obstacle_risk,
          burnoutRisk:  s.burnout_risk,
          animalRisk:   s.animal_risk,
          securityRisk: s.security_risk,
          sizeRisk:     s.size_risk,
          remarks:      s.remarks || '',
          photo:        s.image_url || null,
          loggedAt:     new Date(s.created_at).getTime()
        };
        addSavedMarker(id, pin);
      }

      // Remove markers that are no longer in the DB
      for (const id of Object.keys(savedMarkers)) {
        if (!liveIds.has(id)) {
          if (savedMarkers[id]._popup) savedMarkers[id]._popup.remove();
          savedMarkers[id].remove();
          delete savedMarkers[id];
        }
      }

      // If URL has ?lat=&lng=, automatically open and pin the popup for the matching point
      const urlParams = new URLSearchParams(window.location.search);
      const deepLat = parseFloat(urlParams.get('lat'));
      const deepLng = parseFloat(urlParams.get('lng'));
      if (!isNaN(deepLat) && !isNaN(deepLng)) {
        for (const s of submissions) {
          if (Math.abs(s.lat - deepLat) < 0.0002 && Math.abs(s.lng - deepLng) < 0.0002) {
            const m = savedMarkers[String(s.id)];
            if (m && m._openPinned) {
              m._openPinned();
              break;
            }
          }
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
              <!-- <button class="pop-btn pop-btn-del" onclick="deleteHtLine('${id}')">Remove</button> -->
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

    const name = htLineName.value.trim();
    const lat1 = htPointA.lat, lng1 = htPointA.lng;
    const lat2 = htPointB.lat, lng2 = htPointB.lng;

    htSaveBtn.disabled = true;
    htSaveBtn.textContent = 'Saving…';

    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('lat1', String(lat1));
      fd.append('lng1', String(lng1));
      fd.append('lat2', String(lat2));
      fd.append('lng2', String(lng2));

      const res = await fetch('/submit-line', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || ('HTTP ' + res.status));
      }
      
      // Reload lines from DB to get the real ID
      await loadLines();
    } catch (err) {
      console.error('Save failed', err);
      alert('Could not save this line: ' + err.message);
      htSaveBtn.disabled = false;
      htSaveBtn.textContent = 'Save high tension line';
      return;
    }

    htSaveBtn.disabled = false;
    htSaveBtn.textContent = 'Save high tension line';
    clearHtDrawing();
  });

  htCancelBtn.addEventListener('click', clearHtDrawing);

  window.deleteHtLine = async function(id){
    try {
      const res = await fetch('/delete-line?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
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
      const res = await fetch('/lines');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const lines = await res.json();
      
      const liveIds = new Set();
      for (const row of lines) {
        const id = String(row.id);
        liveIds.add(id);
        savedLines[id] = {
          name: row.name,
          lat1: row.lat1, lng1: row.lng1,
          lat2: row.lat2, lng2: row.lng2,
          loggedAt: new Date(row.created_at).getTime()
        };
      }
      
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

  // --- KMZ CABLE NETWORK OVERLAY ---
  const kmzToggleBtn = document.getElementById('kmzToggleBtn');
  let kmzVisible = true;

  function makeTowerIconCanvas(){
    const ratio = 3;
    const size = 30;
    const canvas = document.createElement('canvas');
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = '#7A4A16';
    ctx.fillStyle = '#7A4A16';
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(6, 27); ctx.lineTo(15, 5);
    ctx.moveTo(24, 27); ctx.lineTo(15, 5);
    ctx.moveTo(9, 21); ctx.lineTo(21, 21);
    ctx.moveTo(10.5, 16); ctx.lineTo(19.5, 16);
    ctx.moveTo(12, 11); ctx.lineTo(18, 11);
    ctx.moveTo(7.5, 8); ctx.lineTo(22.5, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(7.5, 8, 1.5, 0, Math.PI * 2);
    ctx.arc(22.5, 8, 1.5, 0, Math.PI * 2);
    ctx.arc(15, 5, 1.3, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  // --- CABLE LINES FROM DB ---
  let cablesLoaded = false;
  let cablesLoading = false;

  async function loadCablesFromDB(){
    if (cablesLoaded || cablesLoading) return;
    cablesLoading = true;

    const kmzCountEl = document.getElementById('kmzCount');
    if (kmzCountEl) kmzCountEl.textContent = 'Loading cables…';

    try {
      const res = await fetch('/cables');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const geojson = await res.json();

      // Add source with only LineString features (server already filters out towers)
      if (!map.getSource('kmz-cables-source')) {
        map.addSource('kmz-cables-source', { type: 'geojson', data: geojson });
      }

      // Lines-only layer — no tower/symbol layer
      if (!map.getLayer('kmz-lines-layer')) {
        map.addLayer({
          id: 'kmz-lines-layer',
          type: 'line',
          source: 'kmz-cables-source',
          paint: { 'line-color': '#C9781D', 'line-width': 2 }
        });

        map.on('click', 'kmz-lines-layer', function(e) {
          const f = e.features[0];
          const name  = (f.properties.name  || '').trim();
          const group = (f.properties.group || '').trim();
          new maplibregl.Popup({ offset: 8, closeButton: false })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="pop-wrap">
                <button type="button" class="pop-close" onclick="this.closest('.maplibregl-popup').remove()" title="Close">&times;</button>
                <p class="pop-title" style="font-size:14px;">${escapeHtml(name || 'Cable line')}</p>
                ${group ? `<p class="pop-coords-inline">${escapeHtml(group)}</p>` : ''}
              </div>
            `)
            .addTo(map);
        });
        map.on('mouseenter', 'kmz-lines-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'kmz-lines-layer', () => { map.getCanvas().style.cursor = ''; });
      }

      cablesLoaded = true;
      if (kmzCountEl) kmzCountEl.textContent = geojson.features.length.toLocaleString() + ' cable lines loaded';
    } catch(err) {
      console.error('Failed to load cable lines:', err);
      if (kmzCountEl) kmzCountEl.textContent = 'Failed to load cables';
    } finally {
      cablesLoading = false;
    }

    setKmzVisibility(kmzVisible);
  }

  function ensureKmzLayers(){
    // Reattach layer after style change
    if (cablesLoaded && !map.getLayer('kmz-lines-layer') && map.getSource('kmz-cables-source')) {
      map.addLayer({
        id: 'kmz-lines-layer',
        type: 'line',
        source: 'kmz-cables-source',
        paint: { 'line-color': '#C9781D', 'line-width': 2 }
      });
    }
    setKmzVisibility(kmzVisible);
  }

  function setKmzVisibility(visible){
    const vis = visible ? 'visible' : 'none';
    if (map.getLayer('kmz-lines-layer')) map.setLayoutProperty('kmz-lines-layer', 'visibility', vis);
  }

  map.on('styledata', function(){
    if (!map.isStyleLoaded()) return;
    if (cablesLoaded) ensureKmzLayers();
  });

  if (kmzToggleBtn) {
    kmzToggleBtn.addEventListener('click', async function(){
      kmzVisible = !kmzVisible;
      kmzToggleBtn.classList.toggle('active', kmzVisible);
      // Lazy-load cables from DB on first toggle
      if (kmzVisible && !cablesLoaded) {
        await loadCablesFromDB();
      } else {
        setKmzVisibility(kmzVisible);
      }
    });
  }

  map.on('load', function(){
    // Cables are NOT auto-loaded on startup — they are lazy-loaded on first toggle click
    ensureHtMapLayers();
    loadPins();
    loadLines();
    loadCameras();

    // Deep-link: if URL has ?lat=&lng=&zoom= (from submissions list), fly to that location
    const urlParams = new URLSearchParams(window.location.search);
    const deepLat  = parseFloat(urlParams.get('lat'));
    const deepLng  = parseFloat(urlParams.get('lng'));
    const deepZoom = parseFloat(urlParams.get('zoom')) || 14;
    if (!isNaN(deepLat) && !isNaN(deepLng)) {
      map.flyTo({ center: [deepLng, deepLat], zoom: deepZoom, duration: 1200 });
    }
  });