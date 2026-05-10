# News Consolidator

React web app that pulls top headlines from NewsAPI and organizes them by category.

## Features

- Category tabs: General, Technology, Business, Politics, Health, Sports
- Headline cards with summary, source label, and full article link
- Country/source labels
- Auto-refresh every 30 minutes
- Error + retry state

## Local setup

1. Install dependencies:
   - `npm install`
2. Create a local env file:
   - `.env.local`
   - `NEWS_API_KEY=your_newsapi_key_here`
3. Start the app:
   - `npm run dev`

Notes:
- The frontend calls `/api/news`.
- In local dev, Vite proxy forwards requests to NewsAPI and appends your key.

## Deploy live (Vercel)

This project includes a serverless function at `api/news.js` for production.

1. Import this GitHub repo into Vercel.
2. Add environment variable in Vercel project settings:
   - `NEWS_API_KEY=your_newsapi_key_here`
3. Deploy.

The live app will use the same `/api/news` endpoint, now served by Vercel Functions.
