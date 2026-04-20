#!/usr/bin/env node
/**
 * 创建管理员账号
 * 用法: node scripts/create-admin.mjs <email> <name> <password>
 * 示例: node scripts/create-admin.mjs admin@example.com "管理员" mypassword123
 */

import fs from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const USERS_PATH = path.join(ROOT_DIR, "diary-data", "users.json");

async function hashPassword(password) {
  // Simple bcrypt-compatible approach using dynamic import
  const bcrypt = await import("bcryptjs");
  return bcrypt.default.hash(password, 12);
}

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf-8");
}

async function main() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.error("用法: node scripts/create-admin.mjs <email> <name> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("密码至少需要 8 个字符");
    process.exit(1);
  }

  const users = await readUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (existing) {
    console.error(`邮箱 ${email} 已被注册`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = {
    id: randomUUID(),
    email,
    name,
    passwordHash,
    isAdmin: true,
    createdAt: new Date().toISOString(),
  };

  await writeUsers([...users, user]);
  console.log(`✓ 管理员账号创建成功`);
  console.log(`  邮箱: ${email}`);
  console.log(`  姓名: ${name}`);
  console.log(`  ID:   ${user.id}`);
}

main().catch((err) => {
  console.error("错误:", err.message);
  process.exit(1);
});
