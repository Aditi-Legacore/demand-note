// @/app/api/demand-notes/[id]/request-documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendEmail";
import { sendSMS } from "@/lib/sendSMS";

type DemandNoteIdParams = { id: string };

type DemandFileCategory = {
  fileCategory?: string | null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<DemandNoteIdParams> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const demandNoteId = params.id;

    // const canAccessAll =
    //   session.user.role === "Legacore User" ||
    //   session.user.role === "admin" ||
    //   session.user.role === "App admin";

    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    // Fetch demand note with client and files
    const demandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
      include: {
        clients: true,
        files: true,
      },
    });

    if (!demandNote) {
      return NextResponse.json({ error: "Demand note not found" }, { status: 404 });
    }

    // Check which report categories are missing
    const uploadedCategories = new Set(
      demandNote.files
        .map((file: DemandFileCategory) => file.fileCategory)
        .filter((category): category is string => Boolean(category))
    );
    const requiredCategories = ['traffic', 'medical', 'bills'];
    const missingCategories = requiredCategories.filter(cat => !uploadedCategories.has(cat));

    if (missingCategories.length === 0) {
      return NextResponse.json({ message: "All required documents are already uploaded" });
    }

    const primaryClient = demandNote.clients[0];
    if (!primaryClient) {
      return NextResponse.json(
        { error: "No client found for this demand note" },
        { status: 400 }
      );
    }

    const clientDisplayName =
      primaryClient.name ||
      [primaryClient.firstName, primaryClient.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Customer";

    // Prepare message content
    const missingReportsText = missingCategories.join(", ");
    const message = `Dear ${clientDisplayName},

    We require the following documents for your demand note:
    ${missingReportsText}

    Please provide these documents as soon as possible.

    Best regards,
    Legal Team`;

    // Send via email if available
    let sentVia = "none";
    
    if (primaryClient.email) {
     
      
      try {
        await sendEmail({
          to: primaryClient.email,
          subject: "Document Request - Missing Reports Required",
          text: message,
          name: clientDisplayName,
        });
        sentVia = "email";
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // If email fails, try SMS as fallback
        if (primaryClient.phone) {
          try {
            await sendSMS({
              to: primaryClient.phone,
              message: `Dear ${clientDisplayName}, we require the following documents for your demand note: ${missingReportsText}. Please provide them as soon as possible. - Legal Team`,
            });
            sentVia = "sms";
          } catch (smsError) {
            console.error("Failed to send SMS:", smsError);
          }
        }
      }
    } else if (primaryClient.phone) {
      // Send via SMS if no email available
      try {
        await sendSMS({
          to: primaryClient.phone,
          message: `Dear ${clientDisplayName}, we require the following documents for your demand note: ${missingReportsText}. Please provide them as soon as possible. - Legal Team`,
        });
        sentVia = "sms";
      } catch (smsError) {
        console.error("Failed to send SMS:", smsError);
      }
    }

    // Log the activity
    await prisma.demandTimeline.create({
      data: {
        demandNoteId: demandNote.id,
        type: "document-request",
        message: `Requested missing documents: ${missingReportsText} via ${sentVia}`,
      },
    });

    return NextResponse.json({
      message: sentVia !== "none" 
        ? "Document request sent successfully" 
        : "Failed to send document request (no contact method available)",
      missingCategories,
      sentVia
    });

  } catch (error) {
    console.error("Error requesting documents:", error);
    return NextResponse.json(
      { error: "Failed to send document request" },
      { status: 500 }
    );
  }
}
