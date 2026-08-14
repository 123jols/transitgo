# TransitGo

TransitGo is a mobile-first transit planner for **Metro Cebu, Philippines**. It helps commuters find jeepney and bus routes between landmarks, estimates fares (with rider-type discounts), shows the trip on a map, and includes an AI chat assistant for quick route questions. It's built as an installable Progressive Web App (PWA).

## Tech stack

| Layer | Choice |
|---|---|
| UI framework | React 19 |
| Build tool / dev server | Vite 8 (`@vitejs/plugin-react`) |
| Maps | Leaflet 1.9, tiles from CARTO (light/dark), routing via OSRM, geocoding via Nominatim (OpenStreetMap) |
| PWA | `vite-plugin-pwa` (Workbox service worker, installable manifest) |
| AI chat | Google Gemini (`gemini-flash-latest`) called directly from the client |
| Weather | Open-Meteo API |
| Icons | Tabler Icons webfont (loaded via CDN `<link>` in `index.html`) |
| Fonts | Inter, via Google Fonts |
| Linting | ESLint 9, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| State/data | React state + hooks only — no Redux/Zustand; no backend/database (all route data is a static in-memory dataset) |
| Persistence | `localStorage` only (theme, language, recent searches, offline route cache) |

No CSS framework is used — styling is hand-written in `App.css`/`index.css` using CSS custom properties for theming.

## Getting started

```bash
npm install
npm run dev      # start dev server (0.0.0.0, so it's reachable on your LAN too)
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint      # run ESLint
```

### Environment variables

Create a `.env` file in the project root (already present locally, git-ignored):

```
VITE_GEMINI_API_KEY=your-gemini-api-key
```

Used by the AI chat assistant (`src/components/AiChat.jsx`) to call the Gemini API directly from the browser. There is currently no backend proxy, so this key is exposed client-side.

## Project structure

```
src/
├── main.jsx                 # Entry point — sets initial theme before first paint, mounts <App/>
├── App.jsx                  # Root component: ThemeProvider > HomePage + AiChat
├── App.css / index.css      # All app styling (CSS custom properties drive theming)
├── theme.js                 # Legacy/alternate light-theme token object (not consumed by App.css)
├── api/
│   └── transit.js           # Thin query layer over data/db.js (search stops, find routes, popular routes)
├── data/
│   ├── db.js                # Static dataset: stops, verified jeepney routes, walk links
│   └── translations.js      # i18n strings + language list (see "Unwired features" below)
├── utils/
│   ├── geo.js                # Haversine distance calculation
│   └── routing.js            # Graph search over the route dataset (see Routing engine below)
├── hooks/
│   ├── useTheme.js           # Theme context consumer hook
│   └── useOfflineRoutes.js   # Online/offline detection + localStorage route cache (see below)
├── context/
│   └── LanguageContext.jsx   # i18n context provider (see below)
├── components/
│   ├── ThemeProvider.jsx     # Theme context provider (dark/light, persisted to localStorage)
│   ├── ThemeToggle.jsx       # Sun/moon toggle button
│   ├── MapExplorer.jsx       # Full "Explore" tab: free-form place search + OSRM driving directions
│   ├── RouteMap.jsx          # Small map shown on the route details page (origin/dest + road path)
│   ├── AiChat.jsx            # Floating chat widget, calls Gemini API
│   ├── BottomSheet.jsx       # Draggable bottom sheet (collapsed/half/full snap points)
│   ├── BottomNav.jsx         # Bottom tab bar (Home / Explore / Trips / Profile)
│   ├── WeatherTip.jsx        # Geolocation-based weather commuting tip (Open-Meteo)
│   ├── LangSwitcher.jsx      # Language picker UI (unwired, see below)
│   └── OfflineBanner.jsx     # "You're offline" banner (unwired, see below)
└── pages/
    ├── HomePage.jsx           # Main screen: search, results, AI recommendation, tab routing
    ├── RouteDetailsPage.jsx   # Journey breakdown for a selected route
    ├── TripsPage.jsx          # Placeholder ("coming soon")
    └── ProfilePage.jsx        # Placeholder ("coming soon")
```

There is also a nested `transitgo/` directory containing an older/parallel copy of this app (no Leaflet, no PWA plugin). It isn't referenced by the root build — treat the root project as the active one.

## How routing works

Route data lives in `src/data/db.js` as hand-verified jeepney routes (each a sequence of stop IDs, sourced from public route-code guides). `src/utils/routing.js`:

1. Expands each route into every valid boarding→alighting sub-segment (a rider doesn't need to transfer just because the jeepney passes through an intermediate stop).
2. Adds short manual "walk links" between adjacent downtown stops as free, no-fare edges.
3. Runs a depth-first search (max 3 rides, max 2 walking legs, max 6 legs total) between the requested origin and destination stop IDs, collecting up to 6 results.
4. Computes fare/duration per ride segment from real haversine distance using the standard LTFRB minimum-fare formula (₱13 minimum for ≤4km, +₱1.80/km beyond that) and a conservative 12 km/h urban jeepney speed — these numbers are formula-derived, not scraped per-route data.
5. Ranks results by fewest transfers, then duration, then fare.

This only works between the 8 stops curated in `data/db.js` — it's a small demo network, not a full Cebu transit graph.

Separately, `MapExplorer.jsx` and `RouteMap.jsx` do **real-world map routing**: they geocode free-text places via Nominatim and fetch actual driving directions from the public OSRM demo server. This is unrelated to the jeepney route graph — it's used for "Explore the map" and for drawing the road path under a selected jeepney route.

## Theming

`ThemeProvider`/`useTheme` (dark/light) is wired into the app and drives Leaflet tile choice, map polyline color, and all CSS custom properties. Initial theme is read from `localStorage` (`transitgo-theme`) or the OS `prefers-color-scheme` before first paint (in `main.jsx`) to avoid a flash of the wrong theme.

## AI features

- **AI Chat** (`AiChat.jsx`): a floating assistant fed a fixed system prompt with a small hardcoded knowledge base of routes/fares/tips, calling Gemini directly from the browser.
- **AI Recommendation** (`HomePage.jsx`): not an LLM call — a local scoring heuristic (`getAiRouteScore`) that weights discounted fare, duration, and transfer count to pick a "recommended" route from the current search results, with canned copy explaining the pick.

## Progressive Web App

Configured in `vite.config.js` via `vite-plugin-pwa`: auto-updating service worker, installable manifest ("TransitGo — Cebu Transit Planner"), icons in `public/icons/`, and Workbox runtime caching (cache-first for Tabler icon assets, network-first with a 3s timeout for everything else).

## Present but not wired up

These exist in the codebase but aren't imported/rendered from `App.jsx` or any page — they're either leftover or in-progress features:

- `context/LanguageContext.jsx` + `data/translations.js` + `components/LangSwitcher.jsx` — an i18n system with no `LanguageProvider` mounted anywhere.
- `context/LangSwitcher.jsx` — a duplicate of `components/LangSwitcher.jsx` living in the wrong folder.
- `components/OfflineBanner.jsx` + `hooks/useOfflineRoutes.js` — online/offline detection and a `localStorage` route cache, with no component rendering `<OfflineBanner/>`.
- `theme.js` — a separate light-only theme token object not referenced by `App.css`/`index.css`.
- `api/transit.js` → `addRoute()` — a no-op kept only for a "Trips"/"add a route" form that no longer exists in `HomePage.jsx`.

`TripsPage` and `ProfilePage` are static placeholders ("coming soon").

## Known constraints

- No backend — all data is static/in-memory; nothing persists beyond `localStorage` on the user's device.
- The Gemini API key ships in the client bundle (no server-side proxy).
- The jeepney network only covers 8 curated stops in `data/db.js`.
- Third-party APIs used at runtime (Nominatim, OSRM, Open-Meteo) are public demo/free-tier services with no auth and rate limits — fine for a demo, not production-grade.
