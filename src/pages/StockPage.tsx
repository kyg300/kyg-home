import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type Coin, type Exchange, type Stock, type StockSearchResult, type WatchlistItem } from '../lib/api'

const REFRESH_INTERVAL_MS = 10000
const REFRESH_INTERVAL_SEC = REFRESH_INTERVAL_MS / 1000
const SEARCH_DEBOUNCE_MS = 250

function directionClass(direction: string) {
  if (direction === '상승') return 'stock-change-rise'
  if (direction === '하락') return 'stock-change-fall'
  return 'stock-change-flat'
}

function WatchlistSearch({ watchlist, onAdded }: { watchlist: WatchlistItem[]; onAdded: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      api
        .searchStocks(q)
        .then(({ results }) => {
          if (!cancelled) {
            setResults(results)
            setError(null)
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : '검색에 실패했습니다')
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  async function handleAdd(item: StockSearchResult) {
    setAdding(item.code)
    try {
      await api.addWatchlist(item.code, item.name)
      setQuery('')
      setResults([])
      setError(null)
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가하지 못했습니다')
    } finally {
      setAdding(null)
    }
  }

  const owned = new Set(watchlist.map((w) => w.code))

  return (
    <div className="watchlist-search">
      <input
        className="form-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="종목 이름이나 코드로 검색해서 관심종목 추가"
        aria-label="종목 검색"
      />
      {error && <p className="form-error">{error}</p>}
      {query.trim() && (
        <ul className="watchlist-results">
          {searching && results.length === 0 && <li className="status-text">검색 중...</li>}
          {!searching && results.length === 0 && <li className="status-text">검색 결과가 없습니다</li>}
          {results.map((r) => (
            <li key={r.code} className="watchlist-result">
              <span>
                <span className="stock-name">{r.name}</span>{' '}
                <span className="stock-code">
                  {r.code} · {r.market}
                </span>
              </span>
              {owned.has(r.code) ? (
                <span className="status-text">추가됨</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => handleAdd(r)}
                  disabled={adding !== null}
                >
                  {adding === r.code ? '추가 중...' : '추가'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SEC)
  const cancelledRef = useRef(false)

  const load = useCallback(() => {
    setRefreshing(true)
    setSecondsLeft(REFRESH_INTERVAL_SEC)
    api
      .getStocks()
      .then(({ stocks, exchanges, coins, watchlist }) => {
        if (!cancelledRef.current) {
          setStocks(stocks)
          setWatchlist(watchlist)
          setExchanges(exchanges)
          setCoins(coins)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelledRef.current) setError(err instanceof Error ? err.message : '시세를 불러오지 못했습니다')
      })
      .finally(() => {
        if (!cancelledRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      })
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    load()
    const timer = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelledRef.current = true
      clearInterval(timer)
    }
  }, [load])

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  async function handleRemove(item: WatchlistItem) {
    setWatchlist((prev) => prev.filter((w) => w.code !== item.code))
    try {
      await api.removeWatchlist(item.code)
      setRemoveError(null)
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : '삭제하지 못했습니다')
      load()
    }
  }

  const quoteByCode = new Map(stocks.map((s) => [s.code, s]))

  return (
    <section className="page">
      <div className="page-header">
        <h1>시세</h1>
        <div className="stock-refresh-controls">
          <span className="status-text">{secondsLeft}초 후 자동 갱신</span>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={refreshing}>
            {refreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
      </div>
      {loading && <p className="status-text">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && (
        <>
          <h2 className="section-title">관심종목</h2>
          <WatchlistSearch watchlist={watchlist} onAdded={load} />
          {removeError && <p className="form-error">{removeError}</p>}
          {watchlist.length === 0 && (
            <p className="status-text">관심종목이 없어요. 위에서 종목을 검색해 추가해보세요.</p>
          )}
          <ul className="stock-list">
            {watchlist.map((item) => {
              const stock = quoteByCode.get(item.code)
              return (
                <li key={item.code} className="card stock-card">
                  <div className="stock-card-header">
                    <span className="stock-name">{stock?.name ?? item.name}</span>
                    <span className="stock-code">{item.code}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small stock-remove"
                      onClick={() => handleRemove(item)}
                      aria-label={`${item.name} 관심종목에서 삭제`}
                    >
                      삭제
                    </button>
                  </div>
                  {stock ? (
                    <>
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
                    </>
                  ) : (
                    <span className="status-text">시세를 불러오지 못했습니다</span>
                  )}
                </li>
              )
            })}
          </ul>

          <h2 className="section-title">환율</h2>
          <ul className="stock-list">
            {exchanges.map((exchange) => (
              <li key={exchange.code} className="card stock-card">
                <div className="stock-card-header">
                  <span className="stock-name">{exchange.name}</span>
                </div>
                <div className="stock-price-row">
                  <span className="stock-price">{exchange.price}</span>
                  <span className={directionClass(exchange.changeDirection)}>
                    {exchange.changeDirection} {exchange.change} ({exchange.changeRate}%)
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="section-title">코인</h2>
          <ul className="stock-list">
            {coins.map((coin) => (
              <li key={coin.code} className="card stock-card">
                <div className="stock-card-header">
                  <span className="stock-name">{coin.name}</span>
                  <span className="stock-code">{coin.code}</span>
                </div>
                <div className="stock-price-row">
                  <span className="stock-price">{coin.price}원</span>
                  <span className={directionClass(coin.changeDirection)}>
                    {coin.changeDirection} {coin.change} ({coin.changeRate}%)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
