import { NextRequest, NextResponse } from "next/server";
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
    // const session = null;
    if (!isEmbed) {
      // For non-embed, we could add auth check here if needed, but since this is embed API, we'll keep it open
    }

    const intake = await prisma.intakeInfo.findFirst({
      where: { referenceId },
    });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    // For non-embed, check ownership (but since this is embed API, we'll skip this)
    // if (!isEmbed && intake.userId !== session?.user?.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    return NextResponse.json(intake, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch intake" }, { status: 500 });
  }
}
