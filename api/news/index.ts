import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { fetchFeed } from '../_lib/rss.js'

const FEEDS = [
  { source: '연합뉴스', url: 'https://www.yna.co.kr/rss/sports.xml' },
  { source: 'SBS', url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=09' },
  { source: '동아일보', url: 'https://rss.donga.com/sports.xml' },
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  const results = await Promise.allSettled(FEEDS.map(({ source, url }) => fetchFeed(source, url)))

  const articles = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).json({ articles: articles.slice(0, 30) })
}
