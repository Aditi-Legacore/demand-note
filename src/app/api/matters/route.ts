import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matters = await prisma.matter.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(matters);
  } catch (error) {
    console.error('Error fetching matters:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, status } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const matter = await prisma.matter.create({
      data: {
        title,
        description,
        status: status || 'Open',
      },
    });

    return NextResponse.json(matter, { status: 201 });
  } catch (error) {
    console.error('Error creating matter:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
