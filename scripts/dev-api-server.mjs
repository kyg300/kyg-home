import { createServer } from 'node:http'
import { register } from 'node:module'

register('./ts-extension-loader.mjs', import.meta.url)

const PORT = process.env.API_DEV_PORT ?? 3001

const routes = [
  { method: null, pattern: /^\/api\/auth\/signup$/, params: [], file: '../api/auth/signup.ts' },
  { method: null, pattern: /^\/api\/auth\/login$/, params: [], file: '../api/auth/login.ts' },
  { method: null, pattern: /^\/api\/auth\/logout$/, params: [], file: '../api/auth/logout.ts' },
  { method: null, pattern: /^\/api\/auth\/me$/, params: [], file: '../api/auth/me.ts' },
  { method: null, pattern: /^\/api\/posts$/, params: [], file: '../api/posts/index.ts' },
  { method: null, pattern: /^\/api\/posts\/([^/]+)$/, params: ['id'], file: '../api/posts/[id].ts' },
  { method: null, pattern: /^\/api\/blob\/upload$/, params: [], file: '../api/blob/upload.ts' },
  { method: null, pattern: /^\/api\/attachments\/([^/]+)$/, params: ['id'], file: '../api/attachments/[id].ts' },
  { method: null, pattern: /^\/api\/stocks$/, params: [], file: '../api/stocks/index.ts' },
  { method: null, pattern: /^\/api\/translate$/, params: [], file: '../api/translate/index.ts' },
  { method: null, pattern: /^\/api\/news$/, params: [], file: '../api/news/index.ts' },
]

const handlerCache = new Map()

async function loadHandler(file) {
  if (!handlerCache.has(file)) {
    const mod = await import(file)
    handlerCache.set(file, mod.default)
  }
  return handlerCache.get(file)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve(undefined)
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const route = routes.find((r) => r.pattern.test(url.pathname))

  if (!route) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  const match = url.pathname.match(route.pattern)
  const query = Object.fromEntries(url.searchParams)
  route.params.forEach((name, i) => {
    query[name] = match[i + 1]
  })

  let body
  try {
    body = await readBody(req)
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  const vercelReq = { method: req.method, headers: req.headers, query, body }
  const vercelRes = {
    _status: 200,
    status(code) {
      this._status = code
      return this
    },
    setHeader(name, value) {
      res.setHeader(name, value)
      return this
    },
    json(data) {
      res.statusCode = this._status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    },
    send(body) {
      res.statusCode = this._status
      res.end(body)
    },
  }

  try {
    const handler = await loadHandler(route.file)
    await handler(vercelReq, vercelRes)
  } catch (err) {
    console.error(err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Internal error' }))
  }
})

server.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`)
})
