import type { VercelRequest, VercelResponse } from '@vercel/node'

interface MyMemoryResponse {
  responseData?: { translatedText?: string }
  responseStatus?: number | string
  responseDetails?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text, source, target } = req.query
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: '번역할 텍스트가 필요합니다' })
  }
  if (typeof source !== 'string' || typeof target !== 'string') {
    return res.status(400).json({ error: '언어 코드가 필요합니다' })
  }

  const params = new URLSearchParams({ q: text, langpair: `${source}|${target}` })
  const upstream = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`)
  if (!upstream.ok) {
    return res.status(502).json({ error: '번역 서비스에 연결하지 못했습니다' })
  }

  const data = (await upstream.json()) as MyMemoryResponse
  if (String(data.responseStatus) !== '200') {
    return res.status(502).json({ error: data.responseDetails ?? '번역에 실패했습니다' })
  }

  return res.status(200).json({ translatedText: data.responseData?.translatedText ?? '' })
}
