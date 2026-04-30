// middleware.ts
// Protege todas las rutas excepto /login y /api/auth/*.
// Usa jose (Edge-compatible) para verificar JWT.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || '';
const COOKIE_NAME = 'gcx_session';

async function verifyTokenEdge(token: string): Promise<{ username: string } | null> {
  if (!JWT_SECRET || JWT_SECRET.length < 32) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'gcx-dashboard',
      clockTolerance: 60,
    });
    if (typeof payload.username !== 'string') return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyTokenEdge(token) : null;

  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
