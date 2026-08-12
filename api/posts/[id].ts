import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query
  if (typeof id !== 'string') {
    return res.status(400).json({ error: '잘못된 게시글 id입니다' })
  }

  if (req.method === 'GET') {
    const payload = requireAuth(req)
    if (!payload) return res.status(401).json({ error: '로그인이 필요합니다' })

    const rows = await sql`
      select posts.id, posts.title, posts.content, posts.created_at, posts.updated_at,
             posts.user_id, users.username as author_username
      from posts
      join users on users.id = posts.user_id
      where posts.id = ${id}
    `
    const post = rows[0]
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' })
    return res.status(200).json({ post })
  }

  if (req.method === 'PUT') {
    const payload = requireAuth(req)
    if (!payload) return res.status(401).json({ error: '로그인이 필요합니다' })

    const existingRows = await sql`select user_id from posts where id = ${id}`
    const existing = existingRows[0]
    if (!existing) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' })
    if (existing.user_id !== payload.userId) {
      return res.status(403).json({ error: '본인 글만 수정할 수 있습니다' })
    }

    const { title, content } = req.body ?? {}
    if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
      return res.status(400).json({ error: 'title, content가 필요합니다' })
    }

    const rows = await sql`
      update posts set title = ${title.trim()}, content = ${content}, updated_at = now()
      where id = ${id}
      returning id, title, content, created_at, updated_at, user_id
    `
    return res.status(200).json({ post: { ...rows[0], author_username: payload.username } })
  }

  if (req.method === 'DELETE') {
    const payload = requireAuth(req)
    if (!payload) return res.status(401).json({ error: '로그인이 필요합니다' })

    const existingRows = await sql`select user_id from posts where id = ${id}`
    const existing = existingRows[0]
    if (!existing) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' })
    if (existing.user_id !== payload.userId) {
      return res.status(403).json({ error: '본인 글만 삭제할 수 있습니다' })
    }

    await sql`delete from posts where id = ${id}`
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, PUT, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
