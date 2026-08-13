import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
const sql = neon(readFileSync('.env','utf8').match(/DATABASE_URL=(.+)/)[1].trim());
await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id integer REFERENCES orders(id)`;
console.log('Migration complete: order_id added to reviews');
