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
  console.log("Creating customer_addresses table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS customer_addresses_account_id_idx ON customer_addresses (account_id);
  `;
  console.log("customer_addresses table and index created successfully!");

  // If there are existing customer accounts with orders, let's backfill their most recent order address as their default saved address!
  console.log("Checking if we should backfill addresses from past orders...");
  const pastOrders = await sql`
    SELECT DISTINCT ON (account_id) account_id, customer_name, phone, address, city, state, pincode, created_at
    FROM orders
    WHERE account_id IS NOT NULL AND address IS NOT NULL AND address != ''
    ORDER BY account_id, created_at DESC;
  `;

  console.log(`Found ${pastOrders.length} accounts with order history to backfill.`);
  for (const o of pastOrders) {
    const existing = await sql`
      SELECT id FROM customer_addresses 
      WHERE account_id = ${o.account_id}
      LIMIT 1;
    `;
    if (existing.length === 0) {
      await sql`
        INSERT INTO customer_addresses (account_id, name, phone, address, city, state, pincode, is_default, created_at)
        VALUES (${o.account_id}, ${o.customer_name}, ${o.phone}, ${o.address}, ${o.city}, ${o.state}, ${o.pincode}, TRUE, ${o.created_at});
      `;
      console.log(`Backfilled default address for account ID ${o.account_id}`);
    }
  }

  const rows = await sql`SELECT * FROM customer_addresses LIMIT 5;`;
  console.log("Sample customer_addresses:", rows);
}

run().catch(console.error);
