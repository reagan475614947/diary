import os from "node:os";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import next from "next";

const port = Number(process.env.PORT ?? "3000");
const hostname = process.env.HOST ?? "0.0.0.0";
const certDir = path.join(process.cwd(), "certs", "local");
const keyPath = path.join(certDir, "dev-server.key");
const certPath = path.join(certDir, "dev-server.pem");
const caPath = path.join(certDir, "dev-ca.pem");

function getReachableUrls(host, port) {
  if (host !== "0.0.0.0" && host !== "::") {
    return [`https://${host}:${port}`];
  }

  const urls = new Set([
    `https://localhost:${port}`,
    `https://127.0.0.1:${port}`,
  ]);

  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== "IPv4") {
        continue;
      }

      urls.add(`https://${entry.address}:${port}`);
    }
  }

  return [...urls];
}

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error("[HTTPS] Missing local certificates. Run `npm run certs:local` first.");
  process.exit(1);
}

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

https
  .createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined,
    },
    (req, res) => {
      void handle(req, res);
    },
  )
  .listen(port, hostname, () => {
    const urls = getReachableUrls(hostname, port);
    console.log("[HTTPS] Production server is ready.");
    console.log("[HTTPS] 0.0.0.0 is only the bind address, not the browser URL.");
    for (const url of urls) {
      console.log(`[HTTPS] Open: ${url}`);
    }
  });
