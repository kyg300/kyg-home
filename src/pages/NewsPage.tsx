import { useEffect, useState } from 'react'
import { api, type Article } from '../lib/api'

function formatDate(pubDate: string) {
  const date = new Date(pubDate)
  if (Number.isNaN(date.getTime())) return pubDate
  return date.toLocaleString()
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getNews()
      .then(({ articles }) => setArticles(articles))
      .catch((err) => setError(err instanceof Error ? err.message : '뉴스를 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page">
      <div className="page-header">
        <h1>스포츠 뉴스</h1>
      </div>
      {loading && <p className="status-text">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && articles.length === 0 && <p className="status-text">가져올 기사가 없습니다.</p>}
      {!loading && !error && articles.length > 0 && (
        <ul className="news-list">
          {articles.map((article) => (
            <li key={article.link} className="card news-card">
              <a href={article.link} target="_blank" rel="noopener noreferrer" className="news-title">
                {article.title}
              </a>
              <div className="news-meta">
                {article.source} · {formatDate(article.pubDate)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
