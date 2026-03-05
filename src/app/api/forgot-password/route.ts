import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists and role is not admin
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ message: "If an account with that email exists, a password reset request has been initiated and a mail will be send to this email with login credentials by Admin." });
    }

    if (user.roles.includes("admin")) {
      // Admins cannot reset password via this method
      return NextResponse.json({ message: "If an account with that email exists, a password reset request has been initiated." });
    }

    // Update status to false and requestPassword to true
    await prisma.user.update({
      where: { email },
      data: {
        status: false,
        forcePasswordReset: false,
        requestPassword: true,
      },
    });

    return NextResponse.json({ message: "If an account with that email exists, a password reset request has been initiated and a mail will be send to this email with login credentials by Admin." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
