import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.NEWS_API_KEY || env.VITE_NEWS_API_KEY

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/news': {
          target: 'https://newsapi.org',
          changeOrigin: true,
          rewrite: () => '/v2/top-headlines',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const requestUrl = new URL(req.url || '/api/news', 'http://localhost')
              const proxyUrl = new URL(NEWS_API_URL)

              requestUrl.searchParams.forEach((value, key) => {
                proxyUrl.searchParams.set(key, value)
              })
              if (apiKey) {
                proxyUrl.searchParams.set('apiKey', apiKey)
              }

              proxyReq.path = `${proxyUrl.pathname}${proxyUrl.search}`
            })
          },
        },
      },
    },
  }
})

