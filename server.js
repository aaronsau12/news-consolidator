import dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import express from 'express'

const app = express()
const PORT = process.env.PORT || 3001
const NEWS_API_BASE = 'https://newsapi.org/v2'

app.get('/api/news', async (req, res) => {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing NEWS_API_KEY on server.' })
    return
  }

  try {
    const endpoint = req.query.endpoint === 'everything' ? 'everything' : 'top-headlines'
    const url = new URL(`${NEWS_API_BASE}/${endpoint}`)

    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'endpoint' && typeof value === 'string' && value.length > 0) {
        url.searchParams.set(key, value)
      }
    }

    const response = await fetch(url.toString(), {
      headers: { 'X-Api-Key': apiKey },
    })
    const payload = await response.json()

    if (!response.ok || payload.status === 'error') {
      res.status(response.status || 500).json({ error: payload.message || 'NewsAPI request failed.' })
      return
    }

    res.json(payload)
  } catch {
    res.status(500).json({ error: 'Server error while loading news.' })
  }
})

app.listen(PORT, () => {
  console.log(`News proxy server running on http://localhost:${PORT}`)
})
