import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // 🔍 Find existing intake draft for this email
    const draft = await prisma.intakeInfo.findFirst({
      where: {
        email: email,
        isDraft: true,
      },
      select: {
        id: true,
        email: true,
        isDraft: true,
        referenceId: true,  // <-- IMPORTANT
        createdAt: true,
        updatedAt: true,
        // return additional fields only if needed
      },
    });

    if (draft) {
      // ✔ Return referenceId if found
      return NextResponse.json({
        exists: true,
        referenceId: draft.referenceId,
        draft,
      });
    }

    // ❌ No draft found — do NOT create anything
    return NextResponse.json({
      exists: false,
      referenceId: null,
    });

  } catch (error) {
    console.error("Error checking draft:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
