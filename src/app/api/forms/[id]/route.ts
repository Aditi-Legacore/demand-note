import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isEmbedded = request.headers.get('referer') && !request.headers.get('referer')?.includes(request.headers.get('host') || '');

    // Allow access if user is authenticated OR if it's an embedded request
    if (!session && !isEmbedded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const submission = await prisma.formSubmission.findUnique({
      where: { id },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        matter: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // If authenticated, verify ownership
    if (session && submission.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error('Error fetching form submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, data } = await request.json();

    // Verify ownership before updating
    const existingSubmission = await prisma.formSubmission.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingSubmission || existingSubmission.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const submission = await prisma.formSubmission.update({
      where: { id },
      data: {
        status,
        data,
      },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        matter: true,
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error('Error updating form submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const existingSubmission = await prisma.formSubmission.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingSubmission || existingSubmission.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.formSubmission.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting form submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
