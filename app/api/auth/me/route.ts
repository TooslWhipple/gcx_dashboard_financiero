// app/api/auth/me/route.ts
// GET /api/auth/me — devuelve el usuario autenticado

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  return NextResponse.json({ username: user.username });
}
