import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const port = process.env.PORT ?? "3000";
const hostname = process.env.HOST ?? "0.0.0.0";
const certDir = path.join(process.cwd(), "certs", "local");
const keyPath = path.join(certDir, "dev-server.key");
const certPath = path.join(certDir, "dev-server.pem");
const caPath = path.join(certDir, "dev-ca.pem");
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const args = ["dev", "-H", hostname, "-p", port];

if (existsSync(keyPath) && existsSync(certPath)) {
  args.push(
    "--experimental-https",
    "--experimental-https-key",
    keyPath,
    "--experimental-https-cert",
    certPath,
  );

  if (existsSync(caPath)) {
    args.push("--experimental-https-ca", caPath);
  }

  console.log(`[HTTPS] Using local certificates from ${certDir}`);
} else {
  args.push("--experimental-https");
  console.log("[HTTPS] Local certificates not found, falling back to Next.js self-signed cert.");
}

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
