import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { salutation, firstName, lastName, dob, email, password, role } = await req.json();

    if (!email || !password || !firstName || !lastName || !dob ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json({ error: "User already exists" }, { status: 400 });

    const hashed = await hash(password, 10);

    // Generate a unique user ID like USER-AB12CD34
    const uniqueUserId = `USER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const normalizedRole =
      typeof role === "string" && role.trim().length > 0 ? role.trim() : "Customer";

    const user = await prisma.user.create({
      data: {
        salutation,
        firstName,
        lastName,
        dob: new Date(dob),
        email,
        roles: [normalizedRole], // Store role as an array
        password: hashed,
        uniqueUserId,
      },
    });

    // Send Email with the Unique ID
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Welcome to Legasys – Your Unique User ID",
      html: `
        <p>Dear ${salutation || ""} ${firstName} ${lastName},</p>
        <p>Welcome to <strong>Legasys</strong>!</p>
        <p>Your unique user ID is: <strong style="font-size:16px;color:#1a73e8;">${uniqueUserId}</strong></p>
        <p>Please keep it safe for future reference.</p>
        <br/>
        <p>Thank you,<br/>The Legasys Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr);
    }

    return NextResponse.json({ user, redirect: "/" });
  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
