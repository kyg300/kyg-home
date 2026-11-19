import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

const STOCK_CODE_RE = /^[0-9A-Z]{6}$/
const MAX_WATCHLIST = 30
const MAX_NAME = 100

const EXCHANGE_CODES = [
  { code: 'FX_USDKRW', name: '미국 USD' },
  { code: 'FX_EURKRW', name: '유럽연합 EUR' },
  { code: 'FX_JPYKRW', name: '일본 JPY(100)' },
  { code: 'FX_CNYKRW', name: '중국 CNY' },
]

const COIN_MARKETS = [
  { market: 'KRW-BTC', name: '비트코인' },
  { market: 'KRW-ETH', name: '이더리움' },
  { market: 'KRW-XRP', name: '리플' },
]

interface NaverStockDatum {
  itemCode: string
  stockName: string
  closePrice: string
  compareToPreviousClosePrice: string
  compareToPreviousPrice: { text: string }
  fluctuationsRatio: string
  openPrice: string
  highPrice: string
  lowPrice: string
  accumulatedTradingVolume: string
  marketStatus: string
  localTradedAt: string
}

interface NaverExchangeDatum {
  closePrice: string
  fluctuations: string
  fluctuationsRatio: string
  fluctuationsType: { text: string }
  localTradedAt: string
}

interface UpbitTickerDatum {
  market: string
  trade_price: number
  signed_change_price: number
  signed_change_rate: number
  change: 'RISE' | 'FALL' | 'EVEN'
}

interface NaverSearchItem {
  code: string
  name: string
  typeName: string
  nationCode: string
  category: string
}

function queryString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

async function fetchExchange({ code, name }: { code: string; name: string }) {
  const url = `https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=${code}&page=1&pageSize=10`
  const upstream = await fetch(url, { headers: { Referer: `https://m.stock.naver.com/marketindex/exchange/${code}` } })
  if (!upstream.ok) throw new Error(`${name} 환율 조회 실패`)
  const { result } = (await upstream.json()) as { result: NaverExchangeDatum[] }
  const latest = result[0]
  return {
    code,
    name,
    price: latest.closePrice,
    change: latest.fluctuations,
    changeDirection: latest.fluctuationsType.text,
    changeRate: latest.fluctuationsRatio,
    tradedAt: latest.localTradedAt,
  }
}

async function fetchCoins() {
  const markets = COIN_MARKETS.map((c) => c.market).join(',')
  const upstream = await fetch(`https://api.upbit.com/v1/ticker?markets=${markets}`)
  if (!upstream.ok) throw new Error('코인 시세 조회 실패')
  const data = (await upstream.json()) as UpbitTickerDatum[]
  return data.map((d) => {
    const meta = COIN_MARKETS.find((c) => c.market === d.market)
    const direction = d.change === 'RISE' ? '상승' : d.change === 'FALL' ? '하락' : '보합'
    return {
      code: d.market,
      name: meta?.name ?? d.market,
      price: String(d.trade_price),
      change: String(Math.abs(d.signed_change_price)),
      changeDirection: direction,
      changeRate: (Math.abs(d.signed_change_rate) * 100).toFixed(2),
    }
  })
}

async function fetchStocks(codes: string[]) {
  if (!codes.length) return []
  const stockUrl = `https://polling.finance.naver.com/api/realtime/domestic/stock/${codes.join(',')}`
  const upstream = await fetch(stockUrl, { headers: { Referer: 'https://finance.naver.com/' } })
  if (!upstream.ok) throw new Error('시세를 불러오지 못했습니다')
  const { datas } = (await upstream.json()) as { datas: NaverStockDatum[] }
  return datas.map((d) => ({
    code: d.itemCode,
    name: d.stockName,
    price: d.closePrice,
    change: d.compareToPreviousClosePrice,
    changeDirection: d.compareToPreviousPrice.text,
    changeRate: d.fluctuationsRatio,
    open: d.openPrice,
    high: d.highPrice,
    low: d.lowPrice,
    volume: d.accumulatedTradingVolume,
    marketStatus: d.marketStatus,
    tradedAt: d.localTradedAt,
  }))
}

async function searchStocks(q: string) {
  const url = `https://ac.stock.naver.com/ac?${new URLSearchParams({ q, target: 'stock' }).toString()}`
  const upstream = await fetch(url, { headers: { Referer: 'https://m.stock.naver.com/' } })
  if (!upstream.ok) throw new Error('종목 검색 실패')
  const { items } = (await upstream.json()) as { items?: NaverSearchItem[] }
  return (items ?? [])
    .filter((i) => i.nationCode === 'KOR' && i.category === 'stock' && STOCK_CODE_RE.test(i.code))
    .slice(0, 10)
    .map((i) => ({ code: i.code, name: i.name, market: i.typeName }))
}

async function addToWatchlist(req: VercelRequest, res: VercelResponse, userId: string) {
  const { code, name } = req.body ?? {}
  if (typeof code !== 'string' || !STOCK_CODE_RE.test(code)) {
    return res.status(400).json({ error: '종목 코드가 올바르지 않습니다' })
  }
  if (typeof name !== 'string' || !name.trim() || name.length > MAX_NAME) {
    return res.status(400).json({ error: '종목 이름이 올바르지 않습니다' })
  }
  const [{ count }] = await sql`select count(*)::int as count from watchlist where user_id = ${userId}`
  if (count >= MAX_WATCHLIST) {
    return res.status(400).json({ error: `관심종목은 최대 ${MAX_WATCHLIST}개까지 추가할 수 있습니다` })
  }
  await sql`
    insert into watchlist (user_id, code, name) values (${userId}, ${code}, ${name.trim()})
    on conflict (user_id, code) do nothing
  `
  return res.status(201).json({ ok: true })
}

async function removeFromWatchlist(req: VercelRequest, res: VercelResponse, userId: string) {
  const code = queryString(req.query.code)
  if (!code || !STOCK_CODE_RE.test(code)) {
    return res.status(400).json({ error: '종목 코드가 올바르지 않습니다' })
  }
  await sql`delete from watchlist where user_id = ${userId} and code = ${code}`
  return res.status(200).json({ ok: true })
}

// GET              관심종목 시세 + 환율 + 코인
// GET ?q=검색어     국내 종목 검색
// POST {code,name} 관심종목 추가
// DELETE ?code=    관심종목 삭제
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = requireAuth(req)
  if (!payload) {
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  if (req.method === 'POST') return addToWatchlist(req, res, payload.userId)
  if (req.method === 'DELETE') return removeFromWatchlist(req, res, payload.userId)

  const q = queryString(req.query.q)?.trim()
  if (q) {
    try {
      return res.status(200).json({ results: await searchStocks(q.slice(0, 50)) })
    } catch {
      return res.status(502).json({ error: '종목 검색에 실패했습니다' })
    }
  }

  const watchRows = await sql`
    select code, name from watchlist where user_id = ${payload.userId} order by created_at asc
  `
  const codes = watchRows.map((r) => r.code as string)

  const [stocksResult, exchangesResult, coinsResult] = await Promise.allSettled([
    fetchStocks(codes),
    Promise.all(EXCHANGE_CODES.map(fetchExchange)),
    fetchCoins(),
  ])

  const stocks = stocksResult.status === 'fulfilled' ? stocksResult.value : []
  const exchanges = exchangesResult.status === 'fulfilled' ? exchangesResult.value : []
  const coins = coinsResult.status === 'fulfilled' ? coinsResult.value : []

  if (!stocks.length && !exchanges.length && !coins.length) {
    return res.status(502).json({ error: '시세를 불러오지 못했습니다' })
  }

  // 관심종목은 사용자마다 다르므로 CDN 공유 캐시를 쓰지 않는다
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ stocks, exchanges, coins, watchlist: watchRows })
}
