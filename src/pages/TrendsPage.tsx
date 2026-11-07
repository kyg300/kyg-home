import { useEffect, useState } from 'react'
import { api, type TrendItem } from '../lib/api'

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getTrends()
      .then(({ trends }) => setTrends(trends))
      .catch((err) => setError(err instanceof Error ? err.message : '급상승 검색어를 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page">
      <div className="page-header">
        <h1>급상승 검색어</h1>
      </div>
      {loading && <p className="status-text">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && trends.length === 0 && <p className="status-text">가져올 검색어가 없습니다.</p>}
      {!loading && !error && trends.length > 0 && (
        <ul className="news-list">
          {trends.map((trend) => (
            <li key={trend.rank} className="card news-card trend-card">
              <div className="trend-rank">{trend.rank}</div>
              <div className="trend-body">
                <div className="trend-keyword-row">
                  <span className="trend-keyword">{trend.keyword}</span>
                  {trend.traffic && <span className="trend-traffic">검색 {trend.traffic}</span>}
                </div>
                {trend.newsTitle && (
                  <a href={trend.newsLink} target="_blank" rel="noopener noreferrer" className="news-title">
                    {trend.newsTitle}
                  </a>
                )}
                {trend.newsSource && <div className="news-meta">{trend.newsSource}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
