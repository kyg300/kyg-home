import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'

const STOCK_CODES = ['005930', '000660', '035720', '034020']

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  const stockUrl = `https://polling.finance.naver.com/api/realtime/domestic/stock/${STOCK_CODES.join(',')}`

  const [stocksResult, exchangesResult, coinsResult] = await Promise.allSettled([
    fetch(stockUrl, { headers: { Referer: 'https://finance.naver.com/' } }).then(async (r) => {
      if (!r.ok) throw new Error('시세를 불러오지 못했습니다')
      const { datas } = (await r.json()) as { datas: NaverStockDatum[] }
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
    }),
    Promise.all(EXCHANGE_CODES.map(fetchExchange)),
    fetchCoins(),
  ])

  const stocks = stocksResult.status === 'fulfilled' ? stocksResult.value : []
  const exchanges = exchangesResult.status === 'fulfilled' ? exchangesResult.value : []
  const coins = coinsResult.status === 'fulfilled' ? coinsResult.value : []

  if (!stocks.length && !exchanges.length && !coins.length) {
    return res.status(502).json({ error: '시세를 불러오지 못했습니다' })
  }

  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15')
  return res.status(200).json({ stocks, exchanges, coins })
}
