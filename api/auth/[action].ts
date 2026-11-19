import type { VercelRequest, VercelResponse } from '@vercel/node'
import login from '../_lib/auth-handlers/login.js'
import logout from '../_lib/auth-handlers/logout.js'
import me from '../_lib/auth-handlers/me.js'

// Vercel 무료 요금제의 함수 개수 제한(12개) 때문에 /api/auth/login, /logout, /me를
// 하나의 함수로 합쳤다. 실제 처리는 api/_lib/auth-handlers/에 있다 (_lib 안의 파일은 함수로 세지 않음).
const HANDLERS: Record<string, (req: VercelRequest, res: VercelResponse) => unknown> = { login, logout, me }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : ''
  const fn = Object.hasOwn(HANDLERS, action) ? HANDLERS[action] : undefined
  if (!fn) return res.status(404).json({ error: 'Not found' })
  return fn(req, res)
}
