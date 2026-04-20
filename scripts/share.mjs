import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";

const args = new Set(process.argv.slice(2));
const cwd = process.cwd();
const port = Number(process.env.PORT ?? "3000");
const host = process.env.HOST ?? "127.0.0.1";
const nextBin = path.join(cwd, "node_modules", "next", "dist", "bin", "next");
const buildIdPath = path.join(cwd, ".next", "BUILD_ID");
const forceBuild = process.env.SHARE_FORCE_BUILD === "1" || args.has("--build");
const skipBuild = process.env.SHARE_SKIP_BUILD === "1" || args.has("--skip-build");
const preferredProvider = process.env.SHARE_TUNNEL_PROVIDER?.trim().toLowerCase() ?? "";
const processes = [];
let shuttingDown = false;

function printHelp() {
  console.log("Usage: npm run share");
  console.log("");
  console.log("Starts the app locally and exposes a public HTTPS link for WeChat.");
  console.log("");
  console.log("Optional env vars:");
  console.log("  PORT=3000                   Local port to bind");
  console.log("  HOST=127.0.0.1              Local host to bind");
  console.log("  SHARE_SKIP_BUILD=1          Skip build even if no cached build exists");
  console.log("  SHARE_FORCE_BUILD=1         Force a fresh next build before sharing");
  console.log("  SHARE_TUNNEL_PROVIDER=...   Force one of: cloudflared, ngrok, localtunnel");
  console.log("");
  console.log("CLI flags:");
  console.log("  --skip-build                Same as SHARE_SKIP_BUILD=1");
  console.log("  --build                     Same as SHARE_FORCE_BUILD=1");
}

if (args.has("--help") || args.has("-h")) {
  printHelp();
  process.exit(0);
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findExecutable(command) {
  const pathEntries = (process.env.PATH ?? "").split(path.delimiter);

  for (const entry of pathEntries) {
    if (!entry) {
      continue;
    }

    const candidate = path.join(entry, command);
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getProviderCommand(provider) {
  if (provider === "cloudflared") {
    const binary = findExecutable("cloudflared");
    if (!binary) {
      return null;
    }

    return {
      name: "cloudflared",
      command: binary,
      args: ["tunnel", "--url", `http://${host}:${port}`],
      installHint: "brew install cloudflared",
    };
  }

  if (provider === "ngrok") {
    const binary = findExecutable("ngrok");
    if (!binary) {
      return null;
    }

    return {
      name: "ngrok",
      command: binary,
      args: ["http", `http://${host}:${port}`, "--log=stdout"],
      installHint: "brew install ngrok/ngrok/ngrok",
    };
  }

  if (provider === "localtunnel") {
    const localBinary = path.join(cwd, "node_modules", ".bin", "lt");
    if (fileExists(localBinary)) {
      return {
        name: "localtunnel",
        command: localBinary,
        args: ["--port", String(port), "--host", "https://localtunnel.me"],
        installHint: "npm install -D localtunnel",
      };
    }

    const npx = findExecutable("npx");
    if (!npx) {
      return null;
    }

    return {
      name: "localtunnel",
      command: npx,
      args: ["--yes", "localtunnel", "--port", String(port), "--host", "https://localtunnel.me"],
      installHint: "npm install -D localtunnel",
    };
  }

  return null;
}

function resolveTunnelCommand() {
  const providerOrder = preferredProvider
    ? [preferredProvider]
    : ["cloudflared", "ngrok", "localtunnel"];

  for (const provider of providerOrder) {
    const resolved = getProviderCommand(provider);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function prefixLines(stream, prefix, onLine) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    console.log(`${prefix}${line}`);
    onLine?.(line);
  });
  return rl;
}

async function runBuildIfNeeded() {
  if (skipBuild) {
    console.log("[share] Skipping build because SHARE_SKIP_BUILD=1 or --skip-build was set.");
    return;
  }

  if (!forceBuild && fs.existsSync(buildIdPath)) {
    console.log("[share] Reusing the existing production build for a faster startup.");
    console.log("[share] Run `npm run share -- --build` if you want a fresh build first.");
    return;
  }

  console.log("[share] Building the app for a smoother shared session...");

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, "build"], {
      cwd,
      env: process.env,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build failed with exit code ${code ?? "unknown"}.`));
    });

    child.on("error", reject);
  });
}

async function waitForLocalServer(timeoutMs = 30000) {
  const startedAt = Date.now();
  const targetUrl = `http://${host}:${port}`;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(targetUrl, { redirect: "manual" });
      if (response.status > 0) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Local server did not become ready within ${timeoutMs / 1000} seconds.`);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of processes) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
  }, 2000).unref();

  setTimeout(() => process.exit(exitCode), 100).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  const tunnelCommand = resolveTunnelCommand();
  if (!tunnelCommand) {
    console.error("[share] No tunnel provider is available.");
    console.error("[share] Install one of these first:");
    console.error("[share]   brew install cloudflared");
    console.error("[share]   brew install ngrok/ngrok/ngrok");
    console.error("[share]   npm install -D localtunnel");
    process.exit(1);
  }

  await runBuildIfNeeded();

  console.log(`[share] Starting the app at http://${host}:${port} ...`);
  const appProcess = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", String(port)], {
    cwd,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });
  processes.push(appProcess);

  prefixLines(appProcess.stdout, "[app] ");
  prefixLines(appProcess.stderr, "[app] ");

  appProcess.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`[share] App process exited unexpectedly with code ${code ?? "unknown"}.`);
      shutdown(code ?? 1);
    }
  });

  await waitForLocalServer();

  console.log(`[share] Using tunnel provider: ${tunnelCommand.name}`);
  if (tunnelCommand.name === "localtunnel" && tunnelCommand.command.includes("npx")) {
    console.log("[share] First run may take a little longer because localtunnel may be downloaded by npx.");
  }

  const tunnelProcess = spawn(tunnelCommand.command, tunnelCommand.args, {
    cwd,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });
  processes.push(tunnelProcess);

  let hasPrintedUrl = false;
  const handleTunnelLine = (line) => {
    const match = line.match(/https:\/\/[^\s]+/);
    if (!match) {
      return;
    }

    if (hasPrintedUrl) {
      return;
    }

    hasPrintedUrl = true;
    console.log("");
    console.log(`[share] Public HTTPS URL: ${match[0]}`);
    console.log("[share] This link is more likely to open inside WeChat than your local self-signed HTTPS URL.");
    console.log("[share] Your diary data still stays on this Mac in diary-data/.");
    console.log("[share] Press Ctrl+C to stop both the app and the tunnel.");
    console.log("");
  };

  prefixLines(tunnelProcess.stdout, "[tunnel] ", handleTunnelLine);
  prefixLines(tunnelProcess.stderr, "[tunnel] ", handleTunnelLine);

  tunnelProcess.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`[share] Tunnel process exited unexpectedly with code ${code ?? "unknown"}.`);
      console.error(`[share] Provider: ${tunnelCommand.name}`);
      console.error(`[share] Install hint: ${tunnelCommand.installHint}`);
      shutdown(code ?? 1);
    }
  });

  if (!hasPrintedUrl) {
    console.log("[share] Waiting for the public HTTPS URL...");
  }
}

main().catch((error) => {
  console.error("[share] Failed to start the shared session.");
  console.error(error instanceof Error ? error.message : String(error));
  shutdown(1);
});
