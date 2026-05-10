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

const REGION_OPTIONS = [
  { id: 'us', label: 'United States', country: 'us' },
  { id: 'europe', label: 'Europe', country: 'gb' },
  { id: 'asia', label: 'Asia', country: 'in' },
  { id: 'middle-east', label: 'Middle East', query: 'middle east' },
  { id: 'world', label: 'World' },
]

const CACHE_TTL_MS = 60 * 60 * 1000
const REFRESH_INTERVAL_MS = CACHE_TTL_MS
const API_QUERY_MAP = {
  politics: 'politics',
}

const getCacheKey = (category, regionId, search) =>
  `news_${category}_${regionId}_${search || ''}`

const readCache = (key) => {
  try {
    const entry = JSON.parse(localStorage.getItem(key))
    if (!entry || Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null
    return entry
  } catch {
    return null
  }
}

const writeCache = (key, articles) => {
  try {
    localStorage.setItem(key, JSON.stringify({ articles, fetchedAt: Date.now() }))
  } catch {
    // quota exceeded or storage unavailable
  }
}

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
  const [activeRegion, setActiveRegion] = useState('us')
  const [searchInput, setSearchInput] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [articlesByCategory, setArticlesByCategory] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeRegionOption = useMemo(
    () => REGION_OPTIONS.find((region) => region.id === activeRegion) || REGION_OPTIONS[0],
    [activeRegion],
  )

  const { articles, fetchedAt } = useMemo(
    () => articlesByCategory[activeCategory] ?? { articles: [], fetchedAt: null },
    [activeCategory, articlesByCategory],
  )

  const fetchCategory = useCallback(async (category, region, searchQuery) => {
    const cacheKey = getCacheKey(category, region.id, searchQuery)
    const cached = readCache(cacheKey)
    if (cached) return cached

    const queryParams = new URLSearchParams()
    queryParams.set('pageSize', '12')

    const queryChunks = []
    if (searchQuery) {
      queryChunks.push(searchQuery)
    } else if (API_QUERY_MAP[category]) {
      queryChunks.push(API_QUERY_MAP[category])
    }
    if (region.query) {
      queryChunks.push(region.query)
    }

    const shouldUseEverything =
      category === 'politics' || searchQuery.length > 0 || Boolean(region.query)

    if (shouldUseEverything) {
      queryParams.set('endpoint', 'everything')
      queryParams.set('language', 'en')
      queryParams.set('sortBy', 'publishedAt')
      queryParams.set('q', queryChunks.join(' ').trim() || 'breaking news')
    } else {
      queryParams.set('category', category)
      if (region.country) {
        queryParams.set('country', region.country)
      }
    }

    const response = await fetch(`/api/news?${queryParams.toString()}`)

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw new Error(errorPayload.error || 'Could not fetch news right now.')
    }

    const payload = await response.json()
    const articles = payload.articles ?? []
    writeCache(cacheKey, articles)
    return { articles, fetchedAt: Date.now() }
  }, [])

  const fetchNews = useCallback(
    async (initialCategory) => {
      setLoading(true)
      setError('')

      try {
        const targetCategories = initialCategory
          ? [initialCategory]
          : CATEGORY_OPTIONS.map((option) => option.id)

        const results = await Promise.all(
          targetCategories.map(async (category) => {
            try {
              const { articles, fetchedAt } = await fetchCategory(category, activeRegionOption, submittedSearch)
              return { category, articles, fetchedAt, success: true }
            } catch {
              return { category, articles: [], fetchedAt: null, success: false }
            }
          }),
        )

        setArticlesByCategory((previous) => {
          const next = { ...previous }
          for (const result of results) {
            next[result.category] = { articles: result.articles, fetchedAt: result.fetchedAt }
          }
          return next
        })

        if (results.some((result) => !result.success)) {
          setError('Some categories could not be fetched right now.')
        }
      } catch {
        setError('Could not fetch news right now.')
      } finally {
        setLoading(false)
      }
    },
    [activeRegionOption, fetchCategory, submittedSearch],
  )

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
  }, [activeCategory, activeRegion, fetchNews, submittedSearch])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSubmittedSearch(searchInput.trim())
  }

  const handleSearchClear = () => {
    setSearchInput('')
    setSubmittedSearch('')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="headline-kicker">Global Briefing</p>
          <h1>News Consolidator</h1>
          <p className="headline-subtitle">
            Top headlines with quick summaries, source context, and direct links.
          </p>
        </div>
        <div className="meta-panel">
          <p>Refreshes every hour</p>
          <p>{fetchedAt ? `Last updated: ${formatTime(fetchedAt)}` : 'Loading...'}</p>
        </div>
      </header>

      <form className="search-bar" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search for topics (example: Iran, AI, elections)"
        />
        <button type="submit">Search</button>
        {submittedSearch ? (
          <button type="button" className="secondary" onClick={handleSearchClear}>
            Clear
          </button>
        ) : null}
      </form>

      <nav className="region-tabs" aria-label="Region filter">
        {REGION_OPTIONS.map((region) => (
          <button
            key={region.id}
            type="button"
            className={activeRegion === region.id ? 'tab active' : 'tab'}
            onClick={() => setActiveRegion(region.id)}
          >
            {region.label}
          </button>
        ))}
      </nav>

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

      {submittedSearch ? (
        <section className="status-panel">Showing results for "{submittedSearch}".</section>
      ) : null}

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
            {article.urlToImage ? (
              <img className="news-image" src={article.urlToImage} alt={article.title} loading="lazy" />
            ) : (
              <div className="image-fallback">No image available</div>
            )}
            <p className="card-label">
              {activeRegionOption.label} | {article.source?.name || 'Unknown source'} |{' '}
              {getDomain(article.url)}
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
        <section className="status-panel">No stories found for this region/category right now.</section>
      ) : null}
    </main>
  )
}

export default App
