import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  try {
    const { referenceId } = await params;
    if (!referenceId) {
      return NextResponse.json({ error: "Invalid reference ID" }, { status: 400 });
    }

    // For embed (when referenceId is an email), allow access without auth
    const isEmbed = referenceId.includes('@');
    let session = null;
    if (!isEmbed) {
      session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const intake = await prisma.intakeInfo.findFirst({
      where: { referenceId },
    });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    // For non-embed, check ownership
    // if (!isEmbed && intake.userId !== session?.user?.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    return NextResponse.json(intake, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch intake" }, { status: 500 });
  }
}
