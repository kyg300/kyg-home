import { sql } from '../api/_lib/db.ts'

const rows = await sql`select id, title, content from posts order by created_at desc limit 1`
console.log(JSON.stringify(rows, null, 2))
