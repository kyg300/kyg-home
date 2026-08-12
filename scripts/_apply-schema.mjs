import { readFileSync } from 'node:fs'
import { Client } from '@neondatabase/serverless'

const client = new Client(process.env.DATABASE_URL)
await client.connect()
const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')
await client.query(schema)
await client.end()
console.log('Schema applied')
