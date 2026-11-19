import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { sql } from '../_lib/db.js'

// 할 일 / 메모 / D-day를 한 함수에서 처리한다 (?kind=todos|memos|ddays).
// 모두 로그인한 본인 데이터만 읽고 쓴다.

const MAX_TEXT = 500
const MAX_MEMO = 5000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function queryString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

async function handleTodos(req: VercelRequest, res: VercelResponse, userId: string, id: string | null) {
  if (req.method === 'GET') {
    const rows = await sql`
      select id, text, done, created_at from todos
      where user_id = ${userId}
      order by done asc, created_at asc
    `
    return res.status(200).json({ items: rows })
  }
  if (req.method === 'POST') {
    const text = req.body?.text
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT) {
      return res.status(400).json({ error: `할 일은 1~${MAX_TEXT}자로 입력해주세요` })
    }
    const rows = await sql`
      insert into todos (user_id, text) values (${userId}, ${text.trim()})
      returning id, text, done, created_at
    `
    return res.status(201).json({ item: rows[0] })
  }
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다' })
    const { text, done } = req.body ?? {}
    if (text !== undefined && (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT)) {
      return res.status(400).json({ error: `할 일은 1~${MAX_TEXT}자로 입력해주세요` })
    }
    if (done !== undefined && typeof done !== 'boolean') {
      return res.status(400).json({ error: 'done 값이 올바르지 않습니다' })
    }
    const rows = await sql`
      update todos
      set text = coalesce(${text === undefined ? null : text.trim()}, text),
          done = coalesce(${done ?? null}::boolean, done)
      where id = ${id} and user_id = ${userId}
      returning id, text, done, created_at
    `
    if (!rows.length) return res.status(404).json({ error: '항목을 찾을 수 없습니다' })
    return res.status(200).json({ item: rows[0] })
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다' })
    await sql`delete from todos where id = ${id} and user_id = ${userId}`
    return res.status(200).json({ ok: true })
  }
  return null
}

async function handleMemos(req: VercelRequest, res: VercelResponse, userId: string, id: string | null) {
  if (req.method === 'GET') {
    const rows = await sql`
      select id, content, created_at, updated_at from memos
      where user_id = ${userId}
      order by updated_at desc
    `
    return res.status(200).json({ items: rows })
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    const content = req.body?.content
    if (typeof content !== 'string' || !content.trim() || content.length > MAX_MEMO) {
      return res.status(400).json({ error: `메모는 1~${MAX_MEMO}자로 입력해주세요` })
    }
    if (req.method === 'POST') {
      const rows = await sql`
        insert into memos (user_id, content) values (${userId}, ${content})
        returning id, content, created_at, updated_at
      `
      return res.status(201).json({ item: rows[0] })
    }
    if (!id) return res.status(400).json({ error: 'id가 필요합니다' })
    const rows = await sql`
      update memos set content = ${content}, updated_at = now()
      where id = ${id} and user_id = ${userId}
      returning id, content, created_at, updated_at
    `
    if (!rows.length) return res.status(404).json({ error: '항목을 찾을 수 없습니다' })
    return res.status(200).json({ item: rows[0] })
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다' })
    await sql`delete from memos where id = ${id} and user_id = ${userId}`
    return res.status(200).json({ ok: true })
  }
  return null
}

async function handleDdays(req: VercelRequest, res: VercelResponse, userId: string, id: string | null) {
  if (req.method === 'GET') {
    const rows = await sql`
      select id, title, to_char(target_date, 'YYYY-MM-DD') as target_date, created_at from ddays
      where user_id = ${userId}
      order by target_date asc
    `
    return res.status(200).json({ items: rows })
  }
  if (req.method === 'POST') {
    const { title, targetDate } = req.body ?? {}
    if (typeof title !== 'string' || !title.trim() || title.length > MAX_TEXT) {
      return res.status(400).json({ error: `제목은 1~${MAX_TEXT}자로 입력해주세요` })
    }
    if (!isValidDate(targetDate)) {
      return res.status(400).json({ error: '날짜가 올바르지 않습니다' })
    }
    const rows = await sql`
      insert into ddays (user_id, title, target_date) values (${userId}, ${title.trim()}, ${targetDate})
      returning id, title, to_char(target_date, 'YYYY-MM-DD') as target_date, created_at
    `
    return res.status(201).json({ item: rows[0] })
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다' })
    await sql`delete from ddays where id = ${id} and user_id = ${userId}`
    return res.status(200).json({ ok: true })
  }
  return null
}

const HANDLERS = {
  todos: { fn: handleTodos, allow: 'GET, POST, PUT, DELETE' },
  memos: { fn: handleMemos, allow: 'GET, POST, PUT, DELETE' },
  ddays: { fn: handleDdays, allow: 'GET, POST, DELETE' },
} as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req)
  if (!payload) return res.status(401).json({ error: '로그인이 필요합니다' })

  const kind = queryString(req.query.kind)
  if (!kind || !(kind in HANDLERS)) {
    return res.status(400).json({ error: 'kind는 todos, memos, ddays 중 하나여야 합니다' })
  }
  const { fn, allow } = HANDLERS[kind as keyof typeof HANDLERS]
  const id = queryString(req.query.id)
  if (id !== null && !UUID_RE.test(id)) {
    return res.status(404).json({ error: '항목을 찾을 수 없습니다' })
  }

  const result = await fn(req, res, payload.userId, id)
  if (result === null) {
    res.setHeader('Allow', allow)
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return result
}
