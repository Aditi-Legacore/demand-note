import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Weak password' }, { status: 400 });
  }

  const hashed = await hash(password, 6);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      password: hashed,
      forcePasswordReset: true,
    },
  });

  return NextResponse.json({ success: true });
}
