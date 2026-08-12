import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = requireAuth(req)
  if (!payload) {
    return res.status(200).json({ user: null })
  }

  const rows = await sql`select id, email, username from users where id = ${payload.userId}`
  return res.status(200).json({ user: rows[0] ?? null })
}
