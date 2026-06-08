export const DEFAULT_SVG_MARKUP = `<svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SVG panel preview">
  <rect width="640" height="240" rx="24" fill="#0f172a" />
  <circle data-svg-element="status" data-testid="simple-panel-circle" cx="128" cy="120" r="56" fill="#22c55e" />
  <text data-svg-element="label" x="220" y="132" fill="#f8fafc" font-size="28" font-family="Open Sans, Arial, sans-serif">SVG Panel</text>
  <text data-svg-element="hint" x="220" y="166" fill="#94a3b8" font-size="14" font-family="Open Sans, Arial, sans-serif">Click an element to inspect it and bind a series later.</text>
</svg>`;

export const DEFAULT_BINDINGS_JSON = `[
  {
    "elementId": "status",
    "seriesName": "A",
    "action": "fill"
  },
  {
    "elementId": "label",
    "seriesName": "A",
    "action": "text"
  }
]`;