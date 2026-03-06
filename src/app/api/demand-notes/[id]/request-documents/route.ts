// @/app/api/demand-notes/[id]/request-documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendEmail";
import { sendSMS } from "@/lib/sendSMS";

type DemandNoteIdParams = { id: string };

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
    const uploadedCategories = new Set(demandNote.files.map(file => file.fileCategory));
    const requiredCategories = ['traffic', 'medical', 'bills'];
    const missingCategories = requiredCategories.filter(cat => !uploadedCategories.has(cat));

    if (missingCategories.length === 0) {
      return NextResponse.json({ message: "All required documents are already uploaded" });
    }

    // Prepare message content
    const missingReportsText = missingCategories.join(', ');
    const message = `Dear ${demandNote.client.name},

    We require the following documents for your demand note:
    ${missingReportsText}

    Please provide these documents as soon as possible.

    Best regards,
    Legal Team`;

    // Send via email if available
    let sentVia = "none";
    
    if (demandNote.client.email) {
     
      
      try {
        await sendEmail({
          to: demandNote.client.email,
          subject: "Document Request - Missing Reports Required",
          text: message,
          name: demandNote.client.name, // Fixed: added the missing parameter
        });
        sentVia = "email";
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // If email fails, try SMS as fallback
        if (demandNote.client.phone) {
          try {
            await sendSMS({
              to: demandNote.client.phone,
              message: `Dear ${demandNote.client.name}, we require the following documents for your demand note: ${missingReportsText}. Please provide them as soon as possible. - Legal Team`,
            });
            sentVia = "sms";
          } catch (smsError) {
            console.error("Failed to send SMS:", smsError);
          }
        }
      }
    } else if (demandNote.client.phone) {
      // Send via SMS if no email available
      try {
        await sendSMS({
          to: demandNote.client.phone,
          message: `Dear ${demandNote.client.name}, we require the following documents for your demand note: ${missingReportsText}. Please provide them as soon as possible. - Legal Team`,
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
