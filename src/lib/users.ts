import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string;
};

const USERS_PATH = path.join(process.cwd(), "diary-data", "users.json");

async function readUsers(): Promise<User[]> {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

async function writeUsers(users: User[]): Promise<void> {
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf-8");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await readUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function getAllUsers(): Promise<Omit<User, "passwordHash">[]> {
  const users = await readUsers();
  return users.map(({ passwordHash: _, ...rest }) => rest);
}

export async function createUser(opts: {
  email: string;
  name: string;
  password: string;
  isAdmin?: boolean;
}): Promise<User> {
  const users = await readUsers();
  if (users.find((u) => u.email.toLowerCase() === opts.email.toLowerCase())) {
    throw new Error("该邮箱已被注册");
  }
  const passwordHash = await bcrypt.hash(opts.password, 12);
  const user: User = {
    id: crypto.randomUUID(),
    email: opts.email,
    name: opts.name,
    passwordHash,
    isAdmin: opts.isAdmin ?? false,
    createdAt: new Date().toISOString(),
  };
  await writeUsers([...users, user]);
  return user;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("用户不存在");
  users[idx].passwordHash = await bcrypt.hash(newPassword, 12);
  await writeUsers(users);
}
