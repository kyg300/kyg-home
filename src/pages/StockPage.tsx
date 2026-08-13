import { useEffect, useState } from 'react'
import { api, type Stock } from '../lib/api'

const REFRESH_INTERVAL_MS = 15000

function directionClass(direction: string) {
  if (direction === '상승') return 'stock-change-rise'
  if (direction === '하락') return 'stock-change-fall'
  return 'stock-change-flat'
}

export default function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    function load() {
      api
        .getStocks()
        .then(({ stocks }) => {
          if (!cancelled) setStocks(stocks)
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : '시세를 불러오지 못했습니다')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    const timer = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return (
    <section className="page">
      <div className="page-header">
        <h1>시세</h1>
      </div>
      {loading && <p className="status-text">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && (
        <ul className="stock-list">
          {stocks.map((stock) => (
            <li key={stock.code} className="card stock-card">
              <div className="stock-card-header">
                <span className="stock-name">{stock.name}</span>
                <span className="stock-code">{stock.code}</span>
              </div>
              <div className="stock-price-row">
                <span className="stock-price">{stock.price}</span>
                <span className={directionClass(stock.changeDirection)}>
                  {stock.changeDirection} {stock.change} ({stock.changeRate}%)
                </span>
              </div>
              <div className="stock-detail-row">
                <span>시가 {stock.open}</span>
                <span>고가 {stock.high}</span>
                <span>저가 {stock.low}</span>
                <span>거래량 {stock.volume}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
