import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { extractTag } from '../_lib/rss.js'

export interface TrendItem {
  rank: number
  keyword: string
  traffic: string
  newsTitle: string
  newsLink: string
  newsSource: string
}

function parseTrends(xml: string): TrendItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  return itemBlocks.map((block, i) => {
    const newsItemBlock = block.match(/<ht:news_item>[\s\S]*?<\/ht:news_item>/)?.[0] ?? ''
    return {
      rank: i + 1,
      keyword: extractTag(block, 'title'),
      traffic: extractTag(block, 'ht:approx_traffic'),
      newsTitle: extractTag(newsItemBlock, 'ht:news_item_title'),
      newsLink: extractTag(newsItemBlock, 'ht:news_item_url'),
      newsSource: extractTag(newsItemBlock, 'ht:news_item_source'),
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

  const upstream = await fetch('https://trends.google.com/trending/rss?geo=KR')
  if (!upstream.ok) {
    return res.status(502).json({ error: '급상승 검색어를 불러오지 못했습니다' })
  }

  const trends = parseTrends(await upstream.text())

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900')
  return res.status(200).json({ trends })
}
