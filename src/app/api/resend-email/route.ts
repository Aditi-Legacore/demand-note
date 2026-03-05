import { NextRequest, NextResponse } from "next/server";
import { sendIntakeReferenceEmail } from "@/lib/sendEmail";

export async function POST(request: NextRequest) {
  try {
    const { email, name, caseType, referenceId } = await request.json();

    if (!email || !name || !caseType || !referenceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await sendIntakeReferenceEmail(email, name, caseType, referenceId);

    return NextResponse.json({ message: "Email resent successfully", referenceId }, { status: 200 });
  } catch (error) {
    console.error("❌ POST /api/resend-email error:", error);
    return NextResponse.json({ error: "Failed to resend email" }, { status: 500 });
  }
}
