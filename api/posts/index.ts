import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth'
import { sql } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
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

    const { title, content } = req.body ?? {}
    if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
      return res.status(400).json({ error: 'title, content가 필요합니다' })
    }

    const rows = await sql`
      insert into posts (user_id, title, content)
      values (${payload.userId}, ${title.trim()}, ${content})
      returning id, title, content, created_at, updated_at, user_id
    `
    return res.status(201).json({ post: { ...rows[0], author_username: payload.username } })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
