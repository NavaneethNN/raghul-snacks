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
  console.log("Adding shipping_actual and shipping_extra columns to orders table...");
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_actual numeric(10, 2) DEFAULT '0.00'`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_extra numeric(10, 2) DEFAULT '2.00'`;
  console.log("Columns added successfully!");

  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'orders'
  `;
  console.log("orders table columns:", cols.map(c => `${c.column_name} (${c.data_type})`));
}

run().catch(console.error);
