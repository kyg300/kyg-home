import type { VercelRequest, VercelResponse } from '@vercel/node'

const STOCK_CODES = ['005930', '000660', '035720', '034020']

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${STOCK_CODES.join(',')}`
  const upstream = await fetch(url, { headers: { Referer: 'https://finance.naver.com/' } })
  if (!upstream.ok) {
    return res.status(502).json({ error: '시세를 불러오지 못했습니다' })
  }

  const { datas } = (await upstream.json()) as { datas: NaverStockDatum[] }
  const stocks = datas.map((d) => ({
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

  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15')
  return res.status(200).json({ stocks })
}
