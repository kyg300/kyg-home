import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { isValidAttachmentInput, MAX_ATTACHMENTS_PER_POST } from '../_lib/attachments.js'
import { sql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const payload = requireAuth(req)
    if (!payload) return res.status(401).json({ error: '로그인이 필요합니다' })

    const rows = await sql`
      select posts.id, posts.title, posts.content, posts.created_at, posts.updated_at,
             posts.user_id, users.username as author_username
      from posts
      join users on users.id = posts.user_id
      order by posts.created_at desc
    `
    return res.status(200).json({ posts: rows })
  }

  if (req.method === 'POST') {
    const payload = requireAuth(req)
    if (!payload) {
      return res.status(401).json({ error: '로그인이 필요합니다' })
    }

    const { title, content, attachments } = req.body ?? {}
    if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
      return res.status(400).json({ error: 'title, content가 필요합니다' })
    }

    const attachmentList = Array.isArray(attachments) ? attachments : []
    if (attachmentList.length > MAX_ATTACHMENTS_PER_POST) {
      return res.status(400).json({ error: `첨부파일은 최대 ${MAX_ATTACHMENTS_PER_POST}개까지 가능합니다` })
    }
    if (!attachmentList.every(isValidAttachmentInput)) {
      return res.status(400).json({ error: '첨부파일 정보가 올바르지 않습니다' })
    }

    const rows = await sql`
      insert into posts (user_id, title, content)
      values (${payload.userId}, ${title.trim()}, ${content})
      returning id, title, content, created_at, updated_at, user_id
    `
    const post = rows[0]

    const insertedAttachments = []
    for (const a of attachmentList) {
      const attachmentRows = await sql`
        insert into attachments (post_id, filename, url, content_type, size)
        values (${post.id}, ${a.filename}, ${a.url}, ${a.contentType}, ${a.size})
        returning id, filename, content_type, size, created_at
      `
      insertedAttachments.push(attachmentRows[0])
    }

    return res
      .status(201)
      .json({ post: { ...post, author_username: payload.username, attachments: insertedAttachments } })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
