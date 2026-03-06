import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: demandNoteId } = await params;

    // const canAccessAll =
    //   session.user.role === "Legacore User" ||
    //   session.user.role === "admin" ||
    //   session.user.role === "App admin";

    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    const demandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
      include: {
        clients: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        internalNotes: {
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        timeline: {
          orderBy: { createdAt: "desc" },
        },
        files: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (!demandNote) {
      return NextResponse.json(
        { error: "Demand note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(demandNote);
  } catch (err) {
    console.error("❌ GET /api/demand-notes/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch demand note" },
      { status: 500 }
    );
  }
}


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: demandNoteId } = await params;
    const data = await request.json();

    // const canAccessAll =
    //   session.user.role === "Legacore User" ||
    //   session.user.role === "admin" ||
    //   session.user.role === "App admin";

    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    // Verify the demand note exists and belongs to the user
    const existingDemandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
    });

    if (!existingDemandNote) {
      return NextResponse.json({ error: 'Demand note not found' }, { status: 404 });
    }

    const {
      clients, // Array<{ id?, salutation, firstName, middleName, lastName, email, phone }>
      clientPhoneEmail,
      defendantPhoneEmail,
      dateOfLoss,
      demandDate,
      status,
      internalNotes,
      totalAmount,
      description,
      title,
      defendantName,
      claimNumber,
      insuranceName,
      adjuster,
      insuranceAddress,
      phone,
      fax,
      claimType,
      additionalNotes,
    } = data;

    // Verify the demand note exists and belongs to the user
    const currentDemandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
      include: { clients: true }
    });

    if (!currentDemandNote) {
      return NextResponse.json({ error: 'Demand note not found' }, { status: 404 });
    }

    const effectiveClientPhoneEmail = clientPhoneEmail ?? defendantPhoneEmail;

    // 🔍 Synchronize clients
    interface ClientRecord {
      id?: string | null;
    }

    if (clients && Array.isArray(clients)) {
      const incomingClientIds = clients
        .map((c: ClientRecord) => c.id)
        .filter((value): value is string => Boolean(value));
      const existingClientIds = currentDemandNote.clients
        .map((c: ClientRecord) => c.id)
        .filter(
          (value: string | null | undefined): value is string =>
            Boolean(value)
        );

      // 1. Delete clients not in incoming list
      const clientsToDelete = existingClientIds.filter(
        (id) => !incomingClientIds.includes(id)
      );
      if (clientsToDelete.length > 0) {
        await prisma.defedantClient.deleteMany({
          where: { id: { in: clientsToDelete } }
        });
      }

      // 2. Update or create clients
      for (const clientData of clients) {
        const fullName = `${clientData.salutation ? clientData.salutation + ' ' : ''}${clientData.firstName} ${clientData.middleName ? clientData.middleName + ' ' : ''}${clientData.lastName}`.trim();

        if (clientData.id) {
          // Update
          await prisma.defedantClient.update({
            where: { id: clientData.id },
            data: {
              salutation: clientData.salutation,
              firstName: clientData.firstName,
              middleName: clientData.middleName,
              lastName: clientData.lastName,
              name: fullName,
              email: clientData.email,
              phone: clientData.phone,
            }
          });
        } else {
          // Create
          await prisma.defedantClient.create({
            data: {
              demandNoteId: demandNoteId,
              salutation: clientData.salutation,
              firstName: clientData.firstName,
              middleName: clientData.middleName,
              lastName: clientData.lastName,
              name: fullName,
              email: clientData.email,
              phone: clientData.phone,
            }
          });
        }
      }
    }

    const hasDueDate = dateOfLoss !== undefined || demandDate !== undefined;
    const dueDateValue = dateOfLoss ?? demandDate;
    const dueDateData = hasDueDate ? (dueDateValue ? new Date(dueDateValue) : null) : undefined;

    const shouldResetSummary = [
      clients,
      clientPhoneEmail,
      defendantPhoneEmail,
      dateOfLoss,
      demandDate,
      defendantName,
      claimNumber,
      insuranceName,
      adjuster,
      insuranceAddress,
      phone,
      fax,
      claimType,
      additionalNotes,
    ].some((v) => v !== undefined);

    // Update demand note
    const updatedDemandNote = await prisma.demandNote.update({
      where: { id: demandNoteId },
      data: {
        title: title || currentDemandNote.title,
        description: description !== undefined ? description : currentDemandNote.description,
        totalAmount: totalAmount !== undefined ? totalAmount : currentDemandNote.totalAmount,
        dueDate: dueDateData !== undefined ? dueDateData : currentDemandNote.dueDate,
        status: status || currentDemandNote.status,
        defendantPhoneEmail: effectiveClientPhoneEmail !== undefined ? effectiveClientPhoneEmail : currentDemandNote.defendantPhoneEmail,
        defendantName: defendantName !== undefined ? defendantName : currentDemandNote.defendantName,
        claimNumber: claimNumber !== undefined ? claimNumber : currentDemandNote.claimNumber,
        insuranceName: insuranceName !== undefined ? insuranceName : currentDemandNote.insuranceName,
        adjuster: adjuster !== undefined ? adjuster : currentDemandNote.adjuster,
        insuranceAddress: insuranceAddress !== undefined ? insuranceAddress : currentDemandNote.insuranceAddress,
        phone: phone !== undefined ? phone : currentDemandNote.phone,
        fax: fax !== undefined ? fax : currentDemandNote.fax,
        claimType: claimType !== undefined ? claimType : currentDemandNote.claimType,
        additionalNotes: additionalNotes !== undefined ? additionalNotes : currentDemandNote.additionalNotes,
      },
      include: {
        clients: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // If internal notes provided, create a new internal note
    if (internalNotes && internalNotes.trim()) {
      await prisma.demandInternalNote.create({
        data: {
          demandNoteId,
          createdById: session.user.id,
          content: internalNotes.trim(),
        },
      });
    }

    // Add timeline entry for update
    await prisma.demandTimeline.create({
      data: {
        demandNoteId,
        type: 'updated',
        message: 'Demand note updated',
      },
    });

    // Update associated Job records to set publishStatus to 'edit_basic_info' when basic info changes
    if (shouldResetSummary) {
      await prisma.job.updateMany({
        where: { demandNoteId: demandNoteId },
        data: { publishStatus: 'edit_basic_info' }
      });
    }

    if (shouldResetSummary) {
      await prisma.demandFile.updateMany({
        where: { demandNoteId: demandNoteId },
        data: { summaryStatus: "not_summarized" }
      });
    }

    console.log("✅ Demand note updated:", updatedDemandNote);
    return NextResponse.json(updatedDemandNote, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ PUT /api/demand-notes/[id] error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update demand note", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: demandNoteId } = await params;

    // const canAccessAll =
    //   session.user.role === "Legacore User" ||
    //   session.user.role === "admin" ||
    //   session.user.role === "App admin";

    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    // Verify the demand note exists and belongs to the user
    const existingDemandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
    });

    if (!existingDemandNote) {
      return NextResponse.json({ error: 'Demand note not found' }, { status: 404 });
    }

    // Delete the demand note (cascade delete should handle related records)
    await prisma.demandNote.delete({
      where: { id: demandNoteId },
    });

    console.log("✅ Demand note deleted:", demandNoteId);
    return NextResponse.json({ message: 'Demand note deleted successfully' }, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ DELETE /api/demand-notes/[id] error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete demand note", details: errorMessage },
      { status: 500 }
    );
  }
}
