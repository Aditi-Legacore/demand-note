import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/sendEmail";

// helper: generate temporary password
function generateTempPassword(length = 6) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz2345789@#";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: Request) {
  try {
    // ✅ admin auth check
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // ✅ find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ generate temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await hash(tempPassword, 6);

    // ✅ update user password + force reset
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        status: true,
      },
    });

    // ✅ login URL
    const loginUrl = `${process.env.NEXTAUTH_URL}/login`;

    // ✅ send email
    await sendEmail({
      to: user.email,
      subject: "Your Login Details – Action Required",
      text: `
        Your account has been created.

        Login URL:
        ${loginUrl}

        Temporary Password:
        ${tempPassword}

        ⚠️ Important:
        You must reset your password after logging in for the first time.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 16px;">
          <h2>Welcome!</h2>
          <p>Your account has been created.</p>

          <p><b>Login URL:</b><br/>
          <a href="${loginUrl}">${loginUrl}</a></p>
          Login Email: ${user.email}

          <p><b>Temporary Password:</b></p>
          <p style="font-size: 18px; font-weight: bold;">${tempPassword}</p>

          <p style="color: red;">
            You are required to reset your password after login.
          </p>

          <br/>
          <p>— The Legasys Team</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send login mail error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
