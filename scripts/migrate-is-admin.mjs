import { Resolver } from 'node:dns/promises';
import { neon, neonConfig } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import https from 'node:https';

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const envText = readFileSync('.env', 'utf8');
const match = envText.match(/DATABASE_URL=(.+)/);
const originalUrl = match[1].trim();

async function run() {
  const ips = await resolver.resolve4('api.c-6.us-east-2.aws.neon.tech');
  neonConfig.fetchFunction = (input, init = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const req = https.request({
        host: ips[0],
        port: 443,
        path: url.pathname + url.search,
        method: init.method || 'GET',
        headers: { ...init.headers, host: url.hostname },
        servername: url.hostname,
      }, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          resolve(new Response(Buffer.concat(chunks).toString('utf8'), {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
          }));
        });
      });
      req.on('error', reject);
      if (init.body) req.write(init.body);
      req.end();
    });
  };

  const sql = neon(originalUrl);
  console.log("Adding is_admin column to customer_accounts...");
  await sql`ALTER TABLE customer_accounts ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false`;
  console.log("Column is_admin added or already exists.");

  // Also set is_admin = true for account nnnavaneeth171@gmail.com
  const updated = await sql`
    UPDATE customer_accounts 
    SET is_admin = true 
    WHERE email = 'nnnavaneeth171@gmail.com'
    RETURNING id, name, email, is_admin
  `;
  console.log("Updated admin accounts:", updated);

  const cols = await sql`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'customer_accounts'
  `;
  console.log("customer_accounts schema:", cols.map(c => `${c.column_name} (${c.data_type})`));
}

run().catch(console.error);
