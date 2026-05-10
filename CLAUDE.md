# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Serve the dist/ build locally
npm run lint     # ESLint check
```

## Environment Setup

Copy `.env.example` to `.env.local` and set your NewsAPI key:

```
NEWS_API_KEY=your_key_here
```

The key is read by `vite.config.js` for the dev proxy and by `api/news.js` for production.

## Architecture

**Single-page app** — one React component (`src/App.jsx`) fetches from a shared `/api/news` endpoint that behaves differently in dev vs. production:

- **Dev**: Vite proxies `/api/news` → `https://newsapi.org/v2/...`, injecting the `Authorization` header from `process.env.NEWS_API_KEY` (see `vite.config.js`).
- **Production (Vercel)**: `/api/news.js` is a Vercel serverless function that makes the same NewsAPI call server-side, keeping the API key out of the browser bundle.

The frontend never sends the API key directly; both paths hide it server-side.

**Routing logic inside `App.jsx`**:
- Category tabs (General, Technology, Business, Politics, Health, Sports) and region filters (US, Europe, Asia, Middle East, World) determine which NewsAPI endpoint is used:
  - `top-headlines` for category-based queries on US/World
  - `everything` for Politics, regional queries (Europe/Asia/Middle East), and custom search terms
- Auto-refresh fires every 30 minutes (`REFRESH_INTERVAL_MS`).
- Articles render in a CSS Grid (`minmax(280px, 1fr)`) defined in `src/App.css`.
