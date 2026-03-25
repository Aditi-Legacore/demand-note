import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get('referenceId');

    if (referenceId) {
      // Fetch single lead by referenceId or email (no auth required for embed)
      const whereClause = referenceId.includes('@')
        ? { email: referenceId }
        : { referenceId };

      const lead = await prisma.lead.findFirst({
        where: whereClause,
        include: {
          intakeInfo: {
            select: { id: true },
          },
        },
      });

      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      return NextResponse.json(lead, { status: 200 });
    } else {
      // For embed API, we'll return empty array if no referenceId provided
      // This prevents exposing all leads without auth
      return NextResponse.json([], { status: 200 });
    }
  } catch (err) {
    console.error("❌ GET /api/embed/leads error:", err);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
