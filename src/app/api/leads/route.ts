
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// for generating referenceId and storing data in Leads table

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log("📥 POST /api/leads - Received data:", data);

    // Determine prefix based on caseType
    let prefix = "LEG";
    if (data.caseType.toLowerCase().includes("auto")) prefix = "MVA";
    else if (data.caseType.toLowerCase().includes("premises")) prefix = "PRE";
    else if (data.caseType.toLowerCase().includes("dog")) prefix = "SLP";

    const referenceId = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

    const lead = await prisma.lead.create({
      data: {
        name: data.fullName,
        phone: data.phone,
        contact: data.email,
        email: data.email,
        dueDate: new Date(data.dateOfLoss),
        caseType: data.caseType,
        description: data.description,
        referralSource: data.referralSource,
        status: "new",
        matter: "-",
        referenceId,
        // dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
    });

    // Send email (optional, skip if email fails)
    try {
      const { sendIntakeReferenceEmail } = await import("@/lib/sendEmail");
      await sendIntakeReferenceEmail(data.email, data.fullName, data.caseType, referenceId);
    } catch (emailError) {
      console.warn("Email sending failed:", emailError);
      // Continue without failing the lead creation
    }

    console.log("✅ Lead created:", lead);
    return NextResponse.json({ ...lead, referenceId }, { status: 201 });
  } catch (err: unknown) {
    console.error("❌ POST /api/leads error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create lead", details: errorMessage },
      { status: 500 }
    );
  }
}

// export async function GET() {
//   try {
//     const leads = await prisma.lead.findMany({
//       orderBy: { createdAt: "desc" },
//     });
//     return NextResponse.json(leads, { status: 200 });
//   } catch (err) {
//     console.error("❌ GET /api/leads error:", err);
//     return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
//   }
// }

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
      // Fetch all leads (requires auth for admin access)
      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          intakeInfo: {
            select: { id: true },
          },
        },
      });

      return NextResponse.json(leads, { status: 200 });
    }
  } catch (err) {
    console.error("❌ GET /api/leads error:", err);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

