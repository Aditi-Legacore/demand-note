import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    // Validate inputs
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required and must be a string" }, { status: 400 });
    }

    if (!otp || typeof otp !== "string") {
      return NextResponse.json({ error: "OTP is required and must be a string" }, { status: 400 });
    }

    // Find the OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
      },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
      // Delete expired OTP
      await prisma.oTP.delete({
        where: { id: otpRecord.id },
      });
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    // OTP is valid, get the draft data
    const draft = await prisma.intakeInfo.findFirst({
      where: {
        email,
        isDraft: true,
      },
    });

    // Delete the OTP after successful verification
    await prisma.oTP.delete({
      where: { id: otpRecord.id },
    });

    if (draft) {
      return NextResponse.json({
        success: true,
        draft: draft,
      });
    } else {
      return NextResponse.json({
        success: true,
        draft: null,
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
