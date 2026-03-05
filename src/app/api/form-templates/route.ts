import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Temporarily skip auth for testing
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const templates = await prisma.formTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching form templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, language, fields } = await request.json();

    if (!title || !fields) {
      return NextResponse.json({ error: 'Title and fields are required' }, { status: 400 });
    }

    const template = await prisma.formTemplate.create({
      data: {
        title,
        language: language || 'English',
        fields: fields,
        createdBy: session.user.id
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating form template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
