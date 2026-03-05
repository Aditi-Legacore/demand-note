import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendIntakeSubmissionEmail } from "@/lib/email";
import { IntakeFormData } from "@/types/form";
import { buildIntakeData } from "@/lib/intakeData/buildIntakeData";
import { Prisma } from "@prisma/client";


export async function POST(request: NextRequest) {
  try {
    const data: IntakeFormData = await request.json();
    console.log("📥 POST /api/embed/intake - Received data:", data);

    // Validate userId if provided
    if (data.userId) {
      const userExists = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
      if (!userExists) {
        data.userId = undefined; // Set to undefined if user doesn't exist
      }
    }

    // Set LeadId if referenceId is provided
    if (data.referenceId) {
      const lead = await prisma.lead.findUnique({
        where: { referenceId: data.referenceId },
        select: { id: true },
      });
      if (lead) {
        data.LeadId = lead.id;
      }
    }

    let intake;
    if (data.referenceId) {
      const existingDraft = await prisma.intakeInfo.findFirst({
        where: { referenceId: data.referenceId, isDraft: true },
      });

      console.log("existingDraft", existingDraft);

      if (existingDraft) {
        intake = await prisma.intakeInfo.update({
          where: { id: existingDraft.id },
          data: {
            ...buildIntakeData(data as unknown as Record<string, unknown>),
            isDraft: false, // Mark as submitted
          } as Prisma.IntakeInfoUpdateInput,
        });
      } else {
        intake = await prisma.intakeInfo.create({
          data: {
            ...buildIntakeData(data as unknown as Record<string, unknown>),
            isDraft: false, // Mark as submitted
          } as Prisma.IntakeInfoCreateInput,
        });
      }
    } else {
      intake = await prisma.intakeInfo.create({
        data: {
          ...buildIntakeData(data as unknown as Record<string, unknown>),
          isDraft: false, // Mark as submitted
        } as Prisma.IntakeInfoCreateInput,
      });
    }

    console.log("data", data);

    // Update lead status to completed if referenceId exists
    if (data.referenceId) {
      try {
        await prisma.lead.updateMany({
          where: { referenceId: data.referenceId },
          data: { status: "completed" },
        });
        console.log(`✅ Updated lead status to completed for referenceId: ${data.referenceId}`);
      } catch (leadUpdateError) {
        console.error("Failed to update lead status:", leadUpdateError);
        // Don't fail the submission if lead update fails
      }
    }

    // Send email notification after successful submission
    try {
      await sendIntakeSubmissionEmail(data);
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't fail the submission if email fails
    }

    return NextResponse.json(intake, { status: 201 });
  } catch (err: unknown) {
    console.error("❌ POST /api/embed/intake error:", err);
    if (err instanceof Error && 'code' in err && err.code === 'EROFS') {
      return NextResponse.json({ error: "File system is read-only. Please try again later." }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to save intake info", details: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
