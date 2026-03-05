import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { referenceId } = await req.json();

  const lead = await prisma.lead.findUnique({
    where: { referenceId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Invalid reference ID" }, { status: 404 });
  }

  return NextResponse.json(lead, { status: 200 });
}

