const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const apiKey = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing NEWS_API_KEY on server.' })
    return
  }

  try {
    const url = new URL(NEWS_API_URL)
    const query = req.query || {}
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' && value.length > 0) {
        url.searchParams.set(key, value)
      }
    }
    url.searchParams.set('apiKey', apiKey)

    const response = await fetch(url.toString())
    const payload = await response.json()

    if (!response.ok || payload.status === 'error') {
      res.status(response.status || 500).json({
        error: payload.message || 'NewsAPI request failed.',
      })
      return
    }

    res.status(200).json(payload)
  } catch {
    res.status(500).json({ error: 'Server error while loading news.' })
  }
}
