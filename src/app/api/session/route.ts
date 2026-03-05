import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { referenceId } = await req.json();

    if (!referenceId) {
      return NextResponse.json({ error: "Reference ID required" }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { referenceId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Invalid reference ID" }, { status: 404 });
    }

    return NextResponse.json(lead, { status: 200 });
  } catch (error) {
    console.error("❌ Error validating session:", error);
    return NextResponse.json({ error: "Failed to validate session" }, { status: 500 });
  }
}
