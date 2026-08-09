# Cloudflare Pages Backend Setup Guide

This guide explains how to set up, test locally, and deploy the Cloudflare Pages backend (D1 database + ImageKit image storage) for your MapLocate application.

> **Stack:** Cloudflare Pages Functions (TypeScript) · Cloudflare D1 (SQLite) · ImageKit (image storage)

---

## 1. Prerequisites

Install Node.js, then install Wrangler globally:

```bash
npm install -g wrangler
```

Log in to Cloudflare:

```bash
wrangler login
```

---

## 2. Create and Seed the D1 Database

> **Skip if done.** You've already run these steps.

Create the database:

```bash
wrangler d1 create maplocate_db
```

Copy the `database_id` it prints into `wrangler.toml` (already done for you).

Apply the schema **locally** (for dev):

```bash
wrangler d1 execute maplocate_db --local --file=./schema.sql
```

Apply the schema **remotely** (production, run once before first deploy):

```bash
wrangler d1 execute maplocate_db --remote --file=./schema.sql
```

---

## 3. Set Up ImageKit

> ImageKit is the image storage service used instead of Cloudflare R2. It provides a free tier and a global CDN.

1. Create a free account at [https://imagekit.io](https://imagekit.io).
2. Go to **Dashboard → Developer options → API keys**.
3. Note your three values:
   - **Private key** (`sk_...`)
   - **Public key** (`public_...`)
   - **URL endpoint** (e.g. `https://ik.imagekit.io/yourid`)

### Store ImageKit secrets securely in Cloudflare Pages

**Never put these values in `wrangler.toml` or source code.**

Run these three commands — Wrangler will prompt you to paste the value securely:

```bash
wrangler pages secret put IMAGEKIT_PRIVATE_KEY
wrangler pages secret put IMAGEKIT_PUBLIC_KEY
wrangler pages secret put IMAGEKIT_URL_ENDPOINT
```

The secrets are encrypted and stored in Cloudflare. They will be available as `env.IMAGEKIT_PRIVATE_KEY` etc. in your Pages Functions at runtime.

Alternatively, add them in the **Cloudflare Dashboard → Pages → your project → Settings → Environment variables** (make sure to mark them as *Secret*).

---

## 4. Running Locally for Testing

### 4.1 — Set up local dev secrets

Wrangler stores local secrets in a `.dev.vars` file (**never commit this to Git**).

Create `.dev.vars` in the root of your project:

```
IMAGEKIT_PRIVATE_KEY=sk_your_private_key_here
IMAGEKIT_PUBLIC_KEY=public_your_public_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/yourid
```

This file is automatically read by `wrangler pages dev`.

Add it to `.gitignore` if it isn't already:

```bash
echo ".dev.vars" >> .gitignore
```

### 4.2 — Start the local server

```bash
npx wrangler pages dev .
```

Your API endpoints will be available at:

| Endpoint | Method | Description |
|---|---|---|
| `http://localhost:8788/functions/risks` | GET | List risk levels (Low/Med/High) |
| `http://localhost:8788/functions/locations` | GET | List saved locations |
| `http://localhost:8788/functions/submissions` | GET | List submissions (optional `?location_id=`) |
| `http://localhost:8788/functions/submit` | POST | Submit form + upload image to ImageKit |

> **Note on image uploads locally:** The upload call goes to the real ImageKit servers even in local dev, because ImageKit has no local emulator. This is expected and fine for testing — just use your real API key.

---

## 5. Deploying to Production

Since your project auto-deploys from GitHub, just push your changes.
Cloudflare Pages will build and deploy automatically.

Make sure your secrets are configured as described in Step 3 before the first deploy that uses the photo upload feature.

---

## 6. Frontend Integration Examples (`MapLocate.js`)

### Load risk levels dynamically from D1

Add this call when the page or modal loads, so your dropdowns are driven from the database instead of being hardcoded:

```javascript
async function loadRisks() {
  const response = await fetch('/functions/risks');
  const risks = await response.json(); // [{ id: 1, name: 'Low' }, { id: 2, name: 'Medium' }, { id: 3, name: 'High' }]

  const selects = ['obstacleRisk', 'burnoutRisk', 'animalRisk'];
  selects.forEach(selectId => {
    const el = document.getElementById(selectId);
    el.innerHTML = '';
    risks.forEach(risk => {
      const option = document.createElement('option');
      option.value = risk.id;       // send the integer ID to the backend
      option.textContent = risk.name;
      el.appendChild(option);
    });
  });
}
```

### Submit the form via the backend

Replace your current `storeSet` save logic with a `fetch` POST:

```javascript
pinForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!pendingLatLng) return;

  const saveBtn = pinForm.querySelector('.btn-primary');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  const body = new FormData();
  body.append('lat',              pendingLatLng.lat);
  body.append('lng',              pendingLatLng.lng);
  body.append('sector',           document.getElementById('sector').value.trim() || 'Unnamed sector');
  body.append('pic',              document.getElementById('pic').value.trim() || 'Unspecified');
  body.append('obstacle_risk_id', document.getElementById('obstacleRisk').value); // numeric ID
  body.append('burnout_risk_id',  document.getElementById('burnoutRisk').value);
  body.append('animal_risk_id',   document.getElementById('animalRisk').value);
  body.append('remarks',          document.getElementById('remarks').value.trim());

  const photoInput = document.getElementById('photo');
  if (photoInput.files.length > 0) {
    body.append('photo', photoInput.files[0]);
    // DO NOT set Content-Type manually — the browser sets it to
    // multipart/form-data with the correct boundary automatically
  }

  try {
    const response = await fetch('/functions/submit', { method: 'POST', body });
    const result   = await response.json();

    if (response.ok) {
      // Add marker to the map and close the modal as before
      addSavedMarker(...);
      closeForm();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    console.error('Submission failed', err);
    alert('Could not save this point. Check your connection.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save point';
  }
});
```

### Load past submissions for a pin popup

```javascript
async function loadSubmissionsForLocation(locationId) {
  const response = await fetch(`/functions/submissions?location_id=${locationId}`);
  const submissions = await response.json();
  // submissions[n].image_url is a full ImageKit CDN URL (or null if no photo)
  // e.g. "https://ik.imagekit.io/yourid/maplocate/1720000000-abc123.jpg"
  submissions.forEach(s => {
    console.log(s.pic, s.obstacle_risk, s.image_url);
  });
}
```
