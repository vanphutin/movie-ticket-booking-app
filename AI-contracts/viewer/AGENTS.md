# AI-Contracts Viewer Coding Guidelines

This folder contains the interactive single-page web dashboard for viewing and navigating the `AI-contracts` control plane of MovieTicketBookingApp.

## Stack & Architecture
- **Language**: Standard HTML5, CSS3 (Vanilla Dark Glassmorphism Design System), JS (ES6+ Vanilla).
- **Server**: Zero-dependency Node.js HTTP Server (`server.js`) listening on port `3950`.
- **Data Pipeline**: Pre-compiled `contracts-data.js` generated via `node build-data.js`.

## Runnable Commands

```json
{
  "codex-guidelines": {
    "version": "1.0",
    "commands": {
      "build-data": "node build-data.js",
      "check-server": "node server.js --check",
      "start": "node server.js"
    }
  }
}
```

## Guidelines
1. Do not use external heavy UI frameworks (e.g. React/Vue/Tailwind); keep the application lightweight, fast, and self-contained in Vanilla JS/CSS.
2. Ensure cross-reference links (`CAP-*`, `BUS-*`, `TKT-*`, `ADR-*`, `CCR-*`) remain clickable and correctly navigate across tabs and card views.
3. Keep the visual design aligned with modern dark glassmorphism standards (curated HSL colors, smooth transitions, clear badge indicators).
