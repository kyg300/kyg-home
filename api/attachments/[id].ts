import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

function contentDisposition(filename: string, forceDownload: boolean) {
  const encoded = encodeURIComponent(filename)
  const disposition = forceDownload ? 'attachment' : 'inline'
  return `${disposition}; filename="attachment"; filename*=UTF-8''${encoded}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = requireAuth(req)
  if (!payload) return res.status(401).json({ error: '로그인이 필요합니다' })

  const { id, download } = req.query
  if (typeof id !== 'string') {
    return res.status(400).json({ error: '잘못된 첨부파일 id입니다' })
  }

  const rows = await sql`select filename, url, content_type from attachments where id = ${id}`
  const attachment = rows[0]
  if (!attachment) return res.status(404).json({ error: '첨부파일을 찾을 수 없습니다' })

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return res.status(500).json({ error: '스토리지 설정 오류입니다' })

  const blobRes = await fetch(attachment.url, { headers: { authorization: `Bearer ${token}` } })
  if (!blobRes.ok) return res.status(502).json({ error: '파일을 불러오지 못했습니다' })

  const buffer = Buffer.from(await blobRes.arrayBuffer())
  res.setHeader('Content-Type', attachment.content_type)
  res.setHeader('Content-Disposition', contentDisposition(attachment.filename, download === '1'))
  return res.status(200).send(buffer)
}
