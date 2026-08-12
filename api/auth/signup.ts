import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildAuthCookie, hashPassword, signToken } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, username, password } = req.body ?? {}

  if (typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email, username, password가 모두 필요합니다' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedUsername = username.trim()
  if (!normalizedEmail || !normalizedUsername) {
    return res.status(400).json({ error: 'email, username은 비어있을 수 없습니다' })
  }

  const existing = await sql`
    select id from users where email = ${normalizedEmail} or username = ${normalizedUsername}
  `
  if (existing.length > 0) {
    return res.status(409).json({ error: '이미 사용 중인 이메일 또는 사용자명입니다' })
  }

  const passwordHash = await hashPassword(password)
  const rows = await sql`
    insert into users (email, username, password_hash)
    values (${normalizedEmail}, ${normalizedUsername}, ${passwordHash})
    returning id, email, username
  `
  const user = rows[0]

  const token = signToken({ userId: user.id, username: user.username })
  res.setHeader('Set-Cookie', buildAuthCookie(token))
  return res.status(201).json({ user })
}
