import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireAuth } from '../_lib/auth.js'
import { ALLOWED_ATTACHMENT_CONTENT_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from '../_lib/attachments.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = requireAuth(req)
  if (!payload) return res.status(401).json({ error: '로그인이 필요합니다' })

  try {
    const result = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_ATTACHMENT_CONTENT_TYPES,
        maximumSizeInBytes: MAX_ATTACHMENT_SIZE_BYTES,
        addRandomSuffix: true,
      }),
    })
    return res.status(200).json(result)
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : '업로드 처리에 실패했습니다' })
  }
}
