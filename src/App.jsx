import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const CATEGORY_OPTIONS = [
  { id: 'general', label: 'General' },
  { id: 'technology', label: 'Technology' },
  { id: 'business', label: 'Business' },
  { id: 'politics', label: 'Politics' },
  { id: 'health', label: 'Health' },
  { id: 'sports', label: 'Sports' },
]

const REFRESH_INTERVAL_MS = 30 * 60 * 1000

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'Unknown'
  }
}

function App() {
  const [activeCategory, setActiveCategory] = useState('general')
  const [articlesByCategory, setArticlesByCategory] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const articles = useMemo(
    () => articlesByCategory[activeCategory] ?? [],
    [activeCategory, articlesByCategory],
  )

  const fetchCategory = useCallback(async (category) => {
    const response = await fetch(
      `/api/news?category=${encodeURIComponent(category)}&country=us&pageSize=12`,
    )

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw new Error(errorPayload.error || 'Could not fetch news right now.')
    }

    const payload = await response.json()
    return payload.articles ?? []
  }, [])

  const fetchNews = useCallback(async (initialCategory) => {
    setLoading(true)
    setError('')

    try {
      const targetCategories = initialCategory
        ? [initialCategory]
        : CATEGORY_OPTIONS.map((option) => option.id)

      const results = await Promise.all(
        targetCategories.map(async (category) => ({
          category,
          articles: await fetchCategory(category),
        })),
      )

      setArticlesByCategory((previous) => {
        const next = { ...previous }
        for (const result of results) {
          next[result.category] = result.articles
        }
        return next
      })
      setLastUpdated(Date.now())
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setLoading(false)
    }
  }, [fetchCategory])

  useEffect(() => {
    const firstLoadId = setTimeout(() => {
      fetchNews()
    }, 0)

    const refreshId = setInterval(() => {
      fetchNews(activeCategory)
    }, REFRESH_INTERVAL_MS)

    return () => {
      clearTimeout(firstLoadId)
      clearInterval(refreshId)
    }
  }, [activeCategory, fetchNews])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="headline-kicker">Global Briefing</p>
          <h1>News Consolidator</h1>
          <p className="headline-subtitle">
            Top headlines with quick summaries, sources, and direct links.
          </p>
        </div>
        <div className="meta-panel">
          <p>Refreshes every 30 minutes</p>
          <p>{lastUpdated ? `Last updated: ${formatTime(lastUpdated)}` : 'Loading...'}</p>
        </div>
      </header>

      <nav className="category-tabs" aria-label="News categories">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={activeCategory === option.id ? 'tab active' : 'tab'}
            onClick={() => setActiveCategory(option.id)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {error ? (
        <section className="status-panel error">
          <p>{error}</p>
          <button type="button" onClick={() => fetchNews(activeCategory)}>
            Retry
          </button>
        </section>
      ) : null}

      {loading && articles.length === 0 ? (
        <section className="status-panel">Loading headlines...</section>
      ) : null}

      <section className="news-grid">
        {articles.map((article, index) => (
          <article className="news-card" key={`${article.url}-${index}`}>
            <p className="card-label">
              US | {article.source?.name || 'Unknown source'} | {getDomain(article.url)}
            </p>
            <h2>{article.title}</h2>
            <p className="card-summary">
              {article.description || 'No summary available for this story yet.'}
            </p>
            <a href={article.url} target="_blank" rel="noreferrer">
              Read full article
            </a>
          </article>
        ))}
      </section>

      {!loading && articles.length === 0 && !error ? (
        <section className="status-panel">No stories found in this category right now.</section>
      ) : null}
    </main>
  )
}

export default App

