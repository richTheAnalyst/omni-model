# Omni Model (React + Vite, JSX)

Setup:
1. `npm install`
2. Copy `.env.example` to `.env.local` and set `VITE_API_KEY`
3. `npm run dev` (http://localhost:5173, ask the backend owner to allow this origin for CORS)

Scripts: `npm run build`, `npm run check-bundle` (gzip sizes), `npm run mock-api` (dev-only mock server, key `mock-key`, use `VITE_API_URL=http://localhost:8787`), `npm run icons` (regenerate PWA icons).

PWA: installable and offline-capable. `public/manifest.webmanifest` describes the app; `public/sw.js` caches the app shell and hashed assets in production (in development it passes everything through so HMR keeps working) and always fetches API data from the network. Icons live in `public/icons/`; regenerate them with `npm run icons` after changing the logo mark in `src/components/Icon.jsx`.

Notes:
- The API (v0.1.0) has no /profiles endpoint: the business profile lives in `src/config/profile.js` and is sent in full with every /search, /analyze and /outreach call. Replace the placeholder values there with the workspace owner's real profile.
- Country, region, cities and industries are hardcoded in `src/config/markets.js`. The API validates region and sector against the business profile the app sends, and `src/config/profile.js` generates that profile's geography and sectors from `markets.js` — so every listed region and industry works, and adding one there is enough to support it.
- Business name, email, phone and service to market are typed in Settings and sent with every outreach draft.
- VITE_ variables are visible in the browser. Put the API key behind a server-side proxy before public deployment.
