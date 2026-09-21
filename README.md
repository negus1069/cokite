# 🪁 Kite Forecast

Web app that shows a Windfinder-style marine & wind forecast table for any location, with **direct access to the raw data** from open APIs (no scraping).

**Live demo:** [https://negus1069.github.io/cokite/](https://negus1069.github.io/cokite/)

## Data sources (all free, no API key)

- **Weather** (wind, gusts, temperature, pressure, cloud cover, precipitation, WMO code): [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- **Marine** (wave height/direction/period, sea level): [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api)
- **Geocoding** (city search): [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- **Tides & coefficient**: derived client-side from `sea_level_height_msl` (local extrema + daily-range approximation calibrated against each spot's mean spring-tide range).
- **Live wind stations**:
  - [weameter.com](https://weameter.com/stations/ilederekitesurf/windrt/) (Rivedoux, Île de Ré) — polled every 5 s
  - [meteo-la-rochelle.fr](https://www.meteo-la-rochelle.fr/live-chatelaillon.php) `clientraw.txt` (Châtelaillon) — polled every 5 s

The bottom of the page always exposes the raw JSON payload from each API for transparency.

## Local development

```bash
npm install
npm run dev
# open http://localhost:5173
```

Local dev uses Vite reverse proxies (`/weameter/*`, `/mlr/*`) to bypass CORS on the live-station endpoints.

## Build

```bash
npm run build
npm run preview
```

## Deployment (GitHub Pages)

Any push to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.

First-time setup on the repo:
1. Go to **Settings → Pages → Build and deployment**
2. Set **Source = GitHub Actions**

The site will be served at `https://negus1069.github.io/cokite/`.

In production the live-station endpoints go through a chain of public CORS proxies (`corsproxy.io`, `api.allorigins.win`, `api.codetabs.com`) — first success wins.

## Adding a spot

Edit `src/data/spots.ts` — add an entry with `slug`, `name`, `lat`, `lon`, and `springRange` (mean spring-tide range in meters for the reference port). Optional `liveWind` field connects a station feed (`type: 'weameter'` or `type: 'clientraw'`).

## Roadmap

- [x] GitHub Pages deployment
- [x] Live weather-station badges (5 s polling)
- [x] Trailing 1-hour average wind
- [ ] Shareable URLs via `HashRouter`
- [ ] Unit toggles (kts ↔ km/h, m ↔ ft)
- [ ] SHOM-accurate French tidal coefficients (daily cron via GitHub Actions)
- [ ] Kite-friendliness score (green/orange/red) with per-user wind range

