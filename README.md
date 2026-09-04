# SVG Panel plugin

This plugin renders inline SVG markup and lets you bind Grafana series to SVG elements.

It is scaffolded from the official Grafana plugin template and is ready for local development with Docker Compose.

## Installation from a GitHub release

Each pushed tag (`vX.Y.Z`) triggers the `Release` GitHub Actions workflow, which builds and attaches a plugin archive named `grafana-svg-panel-<version>.zip` to the corresponding [GitHub release](../../releases).

1. Download `grafana-svg-panel-<version>.zip` from the release's assets.
2. Extract it into Grafana's plugin directory, keeping the plugin id as the folder name:
   ```bash
   unzip grafana-svg-panel-<version>.zip -d /var/lib/grafana/plugins/grafana-svg-panel
   ```
   The plugin directory path is controlled by the `[paths].plugins` setting (or the `GF_PATHS_PLUGINS` env var) and defaults to `/var/lib/grafana/plugins` on Linux/Docker installs.
3. This plugin isn't signed, so tell Grafana to load it anyway by adding its id to the allow-list, either in `grafana.ini`:
   ```ini
   [plugins]
   allow_loading_unsigned_plugins = grafana-svg-panel
   ```
   or as an environment variable:
   ```bash
   GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=grafana-svg-panel
   ```
4. Restart Grafana (`systemctl restart grafana-server`, or restart the container if you run Grafana in Docker) so it picks up the new plugin.
5. Open a dashboard, add a panel, and pick **SVG Panel** as the visualization.

If you're using this repo's own `docker-compose.yaml`, the plugin directory and unsigned-plugin allow-list are already wired up (see the `grafana` service), so a local build via `npm run build` followed by `docker compose up -d` is enough.

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
