import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntakeFormData } from "@/types/form";
import { buildIntakeData } from "@/lib/intakeData/buildIntakeData";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const intake = await prisma.intakeInfo.findUnique({
      where: { id },
      include: {
        Lead: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    // if (intake.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    return NextResponse.json(intake, { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch intake" }, { status: 500 });
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.intakeInfo.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    // if (existing.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    await prisma.intakeInfo.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Intake deleted successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error("❌ Delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete intake", details: errorMessage },
      { status: 500 }
    );
  }
}


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data: IntakeFormData = await req.json();

    console.log("📝 PUT /api/intake ID:", id);

    // Validate userId if provided
    if (data.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true },
      });
      if (!userExists) data.userId = undefined;
    }

    // If referenceId exists, map LeadId
    if (data.referenceId) {
      const lead = await prisma.lead.findUnique({
        where: { referenceId: data.referenceId },
        select: { id: true },
      });
      if (lead) data.LeadId = lead.id;
    }

    // Use SAME logic as POST → prevents missing fields becoming null
    const updateData = buildIntakeData(data as unknown as Record<string, unknown>);

    // Always set isDraft to false on update
    updateData.isDraft = false;

    const updated = await prisma.intakeInfo.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.intakeInfo.update>[0]['data'],
    });

    // if (updated.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update intake", details: errorMessage },
      { status: 500 }
    );
  }
}
