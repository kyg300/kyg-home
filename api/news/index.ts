import type { VercelRequest, VercelResponse } from '@vercel/node'

const FEEDS = [
  { source: '연합뉴스', url: 'https://www.yna.co.kr/rss/sports.xml' },
  { source: 'SBS', url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=09' },
  { source: '동아일보', url: 'https://rss.donga.com/sports.xml' },
]

interface Article {
  title: string
  link: string
  pubDate: string
  source: string
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  if (!match) return ''
  const raw = match[1].trim()
  const cdataMatch = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return decodeEntities((cdataMatch ? cdataMatch[1] : raw).trim())
}

function parseFeed(xml: string, source: string): Article[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  return itemBlocks.map((block) => ({
    title: extractTag(block, 'title'),
    link: extractTag(block, 'link'),
    pubDate: extractTag(block, 'pubDate'),
    source,
  }))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = await Promise.allSettled(
    FEEDS.map(async ({ source, url }) => {
      const upstream = await fetch(url)
      if (!upstream.ok) throw new Error(`${source} 응답 실패`)
      return parseFeed(await upstream.text(), source)
    }),
  )

  const articles = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).json({ articles: articles.slice(0, 30) })
}
