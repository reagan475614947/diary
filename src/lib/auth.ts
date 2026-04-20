import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  encryptSession,
  decryptSession,
  sessionExpiresAt,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "./session";

export type { SessionPayload };

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encryptSession(payload);
  const expiresAt = sessionExpiresAt();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decryptSession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/");
  return session;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
