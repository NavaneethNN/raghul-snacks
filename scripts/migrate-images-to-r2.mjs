import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

// Load environment variables if not already in process.env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const {
  DATABASE_URL,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

if (!DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error("❌ ERROR: Cloudflare R2 credentials are incomplete in environment.");
  console.error("Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const sql = neon(DATABASE_URL);

async function uploadBase64ToR2(base64Data, folder, id) {
  const match = base64Data.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/);
  if (!match) return null;

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : (contentType.split("/")[1] || "jpg");
  const key = `${folder}/${id}-${Date.now()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

async function migrateTable(tableName, folder, idColumn = "id", imageColumn = "image") {
  console.log(`\n🔍 Checking table "${tableName}"...`);
  let rows = [];
  try {
    rows = await sql.query(`SELECT ${idColumn}, ${imageColumn} FROM ${tableName} WHERE ${imageColumn} IS NOT NULL`);
  } catch (err) {
    if (err.message && err.message.includes("quota")) {
      console.error(`⚠️ Cannot query "${tableName}": Neon database quota exceeded (HTTP 402).`);
      return { total: 0, migrated: 0, failed: 0, skipped: 0, quotaExceeded: true };
    }
    console.error(`❌ Error querying "${tableName}":`, err.message);
    return { total: 0, migrated: 0, failed: 0, skipped: 0, error: err.message };
  }

  const results = { total: rows.length, migrated: 0, failed: 0, skipped: 0, backups: [] };

  for (const row of rows) {
    const id = row[idColumn];
    const img = row[imageColumn];

    if (!img) {
      results.skipped++;
      continue;
    }

    if (!img.startsWith("data:image/")) {
      // Already an external URL (e.g. R2 or public image)
      results.skipped++;
      continue;
    }

    console.log(`  -> Found base64 image in ${tableName} #${id} (${(img.length / 1024).toFixed(1)} KB). Uploading to R2...`);
    try {
      const publicUrl = await uploadBase64ToR2(img, folder, id);
      if (!publicUrl) {
        console.warn(`    ⚠️ Invalid base64 format for #${id}`);
        results.failed++;
        continue;
      }

      // Record backup
      results.backups.push({ id, originalImage: img, newUrl: publicUrl });

      // Update database row
      await sql.query(`UPDATE ${tableName} SET ${imageColumn} = $1 WHERE ${idColumn} = $2`, [publicUrl, id]);
      console.log(`    ✅ Migrated #${id} -> ${publicUrl}`);
      results.migrated++;
    } catch (err) {
      console.error(`    ❌ Failed to migrate #${id}:`, err.message);
      results.failed++;
    }
  }

  return results;
}

async function main() {
  console.log("==================================================");
  console.log(" Cloudflare R2 Image Migration Utility");
  console.log(" Target Bucket:", R2_BUCKET_NAME);
  console.log(" Public URL:", R2_PUBLIC_URL);
  console.log("==================================================");

  const tables = [
    { name: "products", folder: "products" },
    { name: "categories", folder: "categories" },
    { name: "combos", folder: "combos" },
    { name: "banners", folder: "banners" },
  ];

  const allBackups = {};
  let totalMigrated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let hasQuotaError = false;

  for (const t of tables) {
    const res = await migrateTable(t.name, t.folder);
    if (res.quotaExceeded) {
      hasQuotaError = true;
    }
    totalMigrated += res.migrated;
    totalFailed += res.failed;
    totalSkipped += res.skipped;
    if (res.backups && res.backups.length > 0) {
      allBackups[t.name] = res.backups;
    }
  }

  if (Object.keys(allBackups).length > 0) {
    const backupFile = path.resolve(process.cwd(), `scripts/r2-migration-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(allBackups, null, 2), "utf8");
    console.log(`\n💾 Saved rollback backup to: ${backupFile}`);
  }

  console.log("\n==================================================");
  console.log(" Migration Summary");
  console.log("==================================================");
  console.log(` Total Migrated to R2 : ${totalMigrated}`);
  console.log(` Total Skipped (URLs) : ${totalSkipped}`);
  console.log(` Total Failed         : ${totalFailed}`);
  if (hasQuotaError) {
    console.log("\n⚠️ NOTE: Neon database is currently in 402 Quota Exceeded state.");
    console.log(" Once your Neon compute or transfer limit resets/upgrades, re-run:");
    console.log("   node scripts/migrate-images-to-r2.mjs");
  }
  console.log("==================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
