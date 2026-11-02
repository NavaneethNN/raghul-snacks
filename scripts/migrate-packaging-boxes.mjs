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
  const urlObj = new URL(originalUrl);
  const ips = await resolver.resolve4(urlObj.hostname);
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

  console.log("1. Creating packaging_boxes table if it does not exist...");
  await sql`
    CREATE TABLE IF NOT EXISTS packaging_boxes (
      id serial PRIMARY KEY,
      name text NOT NULL,
      length numeric(6, 2) NOT NULL DEFAULT 15.00,
      breadth numeric(6, 2) NOT NULL DEFAULT 15.00,
      height numeric(6, 2) NOT NULL DEFAULT 10.00,
      box_weight_kg numeric(6, 3) NOT NULL DEFAULT 0.120,
      max_capacity_kg numeric(6, 3) NOT NULL DEFAULT 1.200,
      active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  console.log("packaging_boxes table ensured!");

  console.log("2. Adding billed_weight and package_* columns to orders table...");
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS billed_weight numeric(6, 3)`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_length numeric(6, 2)`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_breadth numeric(6, 2)`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_height numeric(6, 2)`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_box_name text`;
  console.log("orders table columns ensured!");

  console.log("3. Adding approx_weight column to order_items table...");
  await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS approx_weight text`;
  console.log("order_items table columns ensured!");

  console.log("4. Checking if seed packaging boxes exist...");
  const existingBoxes = await sql`SELECT count(*)::int as count FROM packaging_boxes`;
  if (existingBoxes[0].count === 0) {
    console.log("Seeding default packaging boxes...");
    await sql`
      INSERT INTO packaging_boxes (name, length, breadth, height, box_weight_kg, max_capacity_kg, active, sort_order)
      VALUES
        ('Small Mailer / Pouch', 20.00, 15.00, 5.00, 0.050, 0.350, true, 1),
        ('Standard Snack Box (2–4 Packs)', 22.00, 16.00, 10.00, 0.120, 1.200, true, 2),
        ('Medium Box (5–8 Packs)', 28.00, 22.00, 14.00, 0.220, 2.500, true, 3),
        ('Large Bulk Carton (9–15 Packs)', 35.00, 28.00, 20.00, 0.380, 6.000, true, 4)
    `;
    console.log("Default packaging boxes seeded!");
  } else {
    console.log(`packaging_boxes already has ${existingBoxes[0].count} entries.`);
  }

  const boxes = await sql`SELECT * FROM packaging_boxes ORDER BY sort_order ASC, max_capacity_kg ASC`;
  console.log("Current packaging boxes in DB:", boxes);
}

run().catch(console.error);
