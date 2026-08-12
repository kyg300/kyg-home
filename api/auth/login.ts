import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildAuthCookie, signToken, verifyPassword } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email, password가 필요합니다' })
  }

  const rows = await sql`
    select id, email, username, password_hash from users where email = ${email.trim().toLowerCase()}
  `
  const user = rows[0]
  if (!user) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' })
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' })
  }

  const token = signToken({ userId: user.id, username: user.username })
  res.setHeader('Set-Cookie', buildAuthCookie(token))
  return res.status(200).json({ user: { id: user.id, email: user.email, username: user.username } })
}
