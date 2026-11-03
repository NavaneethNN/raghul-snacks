import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";
import https from "node:https";
import { Resolver } from "node:dns/promises";

// Setup resilient DNS resolution & persistent TCP keep-alive connection pool for Neon Postgres
const keepAliveAgent = typeof window === "undefined"
  ? new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 120000,
      maxSockets: 128,
      maxFreeSockets: 32,
    })
  : undefined;

if (typeof window === "undefined" && !neonConfig.fetchFunction) {
  const resolver = new Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  const ipCache = new Map<string, { ip: string; time: number }>();
  const dnsPending = new Map<string, Promise<string | null>>();

  async function resolveHostIp(hostname: string): Promise<string | null> {
    const cached = ipCache.get(hostname);
    if (cached && Date.now() - cached.time < 7200000) return cached.ip;
    if (dnsPending.has(hostname)) return dnsPending.get(hostname)!;

    const promise = (async () => {
      try {
        const ips = await resolver.resolve4(hostname);
        if (ips && ips.length > 0) {
          ipCache.set(hostname, { ip: ips[0], time: Date.now() });
          return ips[0];
        }
      } catch {
        // Fallback
      } finally {
        dnsPending.delete(hostname);
      }
      return null;
    })();

    dnsPending.set(hostname, promise);
    return promise;
  }

  neonConfig.fetchFunction = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(urlString);

    // Only intercept .neon.tech requests to prevent ENOTFOUND on local DNS
    if (url.hostname.includes("neon.tech")) {
      const ip = await resolveHostIp(url.hostname);
      if (ip) {
        return new Promise<Response>((resolve, reject) => {
          const headers: Record<string, string> = {};
          if (init.headers) {
            if (init.headers instanceof Headers) {
              init.headers.forEach((v, k) => { headers[k] = v; });
            } else if (Array.isArray(init.headers)) {
              init.headers.forEach(([k, v]) => { headers[k] = v; });
            } else {
              Object.assign(headers, init.headers);
            }
          }
          headers["host"] = url.hostname;

          const req = https.request({
            host: ip,
            port: 443,
            path: url.pathname + url.search,
            method: init.method || "POST",
            headers,
            servername: url.hostname,
            agent: keepAliveAgent,
          }, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
              const body = Buffer.concat(chunks).toString("utf8");
              resolve(new Response(body, {
                status: res.statusCode || 200,
                statusText: res.statusMessage || "OK",
                headers: res.headers as unknown as HeadersInit,
              }));
            });
          });
          req.on("error", reject);
          if (init.body) {
            req.write(init.body);
          }
          req.end();
        });
      }
    }

    return fetch(input, init);
  };
}

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to access the database.");
  if (!dbInstance) {
    dbInstance = drizzle({ client: neon(databaseUrl), schema });
  }
  return dbInstance;
}
