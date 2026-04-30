// app/api/auth/login/route.ts
// POST /api/auth/login — verifica credenciales y emite JWT en cookie httpOnly

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    const token = await createToken(user.username);
    await setAuthCookie(token);

    return NextResponse.json({ success: true, username: user.username });
  } catch (err) {
    console.error('[AUTH LOGIN]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
