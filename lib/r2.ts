import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Upload a base64 image to R2 and return the public URL.
 * @param base64 - The full data URI (e.g. "data:image/jpeg;base64,...")
 * @param key - The object key (e.g. "products/my-product.jpg")
 */
export async function uploadImageToR2(base64: string, key: string): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicUrl) throw new Error("R2 bucket/public URL not configured.");

  // Parse the base64 data URI
  const match = base64.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid base64 image format.");

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return `${publicUrl}/${key}`;
}

/**
 * Delete an image from R2 by its public URL.
 */
export async function deleteImageFromR2(url: string): Promise<void> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicUrl) return;

  // Extract key from URL
  if (!url.startsWith(publicUrl)) return;
  const key = url.slice(publicUrl.length + 1); // remove trailing slash

  try {
    const client = getR2Client();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // Non-fatal — log but don't throw
    console.warn(`[r2] Failed to delete ${key}`);
  }
}
