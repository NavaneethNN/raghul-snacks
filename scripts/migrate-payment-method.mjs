import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
const sql = neon(readFileSync('.env','utf8').match(/DATABASE_URL=(.+)/)[1].trim());
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'online'`;
console.log('Migration complete: payment_method added to orders');
