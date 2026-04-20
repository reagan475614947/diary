import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export const SESSION_COOKIE_NAME = "diary-session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(sessionExpiresAt())
    .sign(getKey());
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}
