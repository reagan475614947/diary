#!/usr/bin/env node
/**
 * 创建普通用户账号
 * 用法: node scripts/create-user.mjs <email> <name> <password>
 */

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const USERS_PATH = path.join(ROOT_DIR, "diary-data", "users.json");

async function main() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.error("用法: node scripts/create-user.mjs <email> <name> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("密码至少需要 8 个字符");
    process.exit(1);
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.default.hash(password, 12);

  let users = [];
  try {
    const raw = await fs.readFile(USERS_PATH, "utf-8");
    users = JSON.parse(raw);
  } catch {
    // file doesn't exist yet
  }

  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    console.error(`邮箱 ${email} 已被注册`);
    process.exit(1);
  }

  const user = {
    id: randomUUID(),
    email,
    name,
    passwordHash,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify([...users, user], null, 2), "utf-8");

  console.log(`✓ 用户账号创建成功`);
  console.log(`  邮箱: ${email}`);
  console.log(`  姓名: ${name}`);
}

main().catch((err) => {
  console.error("错误:", err.message);
  process.exit(1);
});
