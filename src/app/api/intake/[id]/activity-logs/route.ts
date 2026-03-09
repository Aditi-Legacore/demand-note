import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const intakeId = (await params).id;

    // Verify the intake belongs to the user
    // const intake = await prisma.intakeInfo.findUnique({
    //   where: { id: intakeId },
    //   select: { userId: true },
    // });

    // if (!intake || intake.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Fetch activity logs for the intake
    const activityLogs = await prisma.activityLog.findMany({
      where: { intakeId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch user details for each activity log
    type ActivityLogRecord = Awaited<ReturnType<typeof prisma.activityLog.findMany>>[number];

    const logsWithUserNames = await Promise.all(
      activityLogs.map(async (log: ActivityLogRecord) => {
        const user = await prisma.user.findUnique({
          where: { uniqueUserId: log.createdBy },
          select: { firstName: true, lastName: true },
        });
        return {
          ...log,
          createdByName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : log.createdBy,
        };
      })
    );

    return NextResponse.json(logsWithUserNames);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    if (error instanceof Error && 'code' in error && error.code === 'EROFS') {
      return NextResponse.json({ error: "File system is read-only. Please try again later." }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const intakeId = (await params).id;
    const { action, details } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Verify the intake belongs to the user
    // const intake = await prisma.intakeInfo.findUnique({
    //   where: { id: intakeId },
    //   select: { userId: true },
    // });

    // if (!intake || intake.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, uniqueUserId: true },
    });

    if (!user?.uniqueUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create activity log
    const activityLog = await prisma.activityLog.create({
      data: {
        intakeId,
        activityType: action,
        shortDescription: action,
        longDescription: details || '',
        createdBy: user.uniqueUserId,
      },
    });

    return NextResponse.json(activityLog);
  } catch (error) {
    console.error('Error creating activity log:', error);
    if (error instanceof Error && 'code' in error && error.code === 'EROFS') {
      return NextResponse.json({ error: "File system is read-only. Please try again later." }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
