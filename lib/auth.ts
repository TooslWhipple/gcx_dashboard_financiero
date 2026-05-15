// lib/auth.ts
// Utilidades de autenticacion: bcrypt + JWT (jose, Edge-compatible) + cookies httpOnly

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || '';
export const COOKIE_NAME = 'gcx_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 días

function getSecret() {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(JWT_SECRET);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('gcx-dashboard')
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
  if (!JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: 'gcx-dashboard',
      clockTolerance: 60,
    });
    if (typeof payload.username !== 'string') return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
