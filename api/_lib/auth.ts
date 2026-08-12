import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { VercelRequest } from '@vercel/node'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}

const COOKIE_NAME = 'kyg_home_token'

export interface TokenPayload {
  userId: string
  username: string
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload
  } catch {
    return null
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map((pair) => {
      const [key, ...rest] = pair.trim().split('=')
      return [key, decodeURIComponent(rest.join('='))]
    }),
  )
}

export function getTokenFromRequest(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  return parseCookies(cookieHeader)[COOKIE_NAME] ?? null
}

export function requireAuth(req: VercelRequest): TokenPayload | null {
  const token = getTokenFromRequest(req)
  if (!token) return null
  return verifyToken(token)
}

export function buildAuthCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ]
  if (isProd) parts.push('Secure')
  return parts.join('; ')
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
}
