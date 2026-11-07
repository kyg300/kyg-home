export interface RssArticle {
  title: string
  link: string
  pubDate: string
  source: string
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
}

export function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  if (!match) return ''
  const raw = match[1].trim()
  const cdataMatch = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return decodeEntities((cdataMatch ? cdataMatch[1] : raw).trim())
}

export function parseFeed(xml: string, source: string): RssArticle[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  return itemBlocks.map((block) => ({
    title: extractTag(block, 'title'),
    link: extractTag(block, 'link'),
    pubDate: extractTag(block, 'pubDate'),
    source,
  }))
}

export async function fetchFeed(source: string, url: string): Promise<RssArticle[]> {
  const upstream = await fetch(url)
  if (!upstream.ok) throw new Error(`${source} 응답 실패`)
  return parseFeed(await upstream.text(), source)
}
