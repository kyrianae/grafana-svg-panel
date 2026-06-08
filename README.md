# SVG Panel plugin

This plugin renders inline SVG markup and lets you bind Grafana series to SVG elements.

It is scaffolded from the official Grafana plugin template and is ready for local development with Docker Compose.

## Local setup

1. Install dependencies with `npm install`.
2. Start the frontend build with `npm run dev`.
3. Start Grafana with `docker compose up --build`.
4. Open Grafana at `http://localhost:3000` and add the panel to a dashboard.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run test:ci`
- `npm run e2e` after `npm exec playwright install chromium`

## Current panel model

- `svgMarkup` stores the raw inline SVG content.
- `bindingsJson` stores the binding rules that connect SVG element ids to query series.
- Clicking an SVG element highlights the selected element in the panel footer.

The first implementation is intentionally simple so the SVG editor can later be upgraded to a URL source and a richer binding UI.
