import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await request.json();
        console.log("📥 POST /api/demand-notes - Received data:", data);

        const {
            clients, // Array<{ salutation, firstName, middleName, lastName, email, phone }>
            defendantPhoneEmail,

            demandCreatedDate,
            dateOfLoss,
            status = "draft",

            defendantName,
            claimNumber,
            insuranceName,
            adjuster,
            insuranceAddress,
            phone,
            fax,
            claimType,

            internalNotes,
            additionalNotes,
            description,
            totalAmount = 0,
            files = {},
        } = data;

        if (!clients || !Array.isArray(clients) || clients.length === 0) {
            return NextResponse.json(
                { error: "At least one client is required" },
                { status: 400 }
            );
        }

        if (!demandCreatedDate) {
            return NextResponse.json(
                { error: "demandCreatedDate is required" },
                { status: 400 }
            );
        }

        const dueDateValue = dateOfLoss ? new Date(dateOfLoss) : null;
        if (dueDateValue && Number.isNaN(dueDateValue.getTime())) {
            return NextResponse.json(
                { error: "Invalid dateOfLoss value" },
                { status: 400 }
            );
        }

        // Generate a title based on the first client
        const firstClient = clients[0];
        const primaryClientName = `${firstClient.firstName} ${firstClient.lastName}`.trim();

        // 📝 Create demand note first
        const demandNote = await prisma.demandNote.create({
            data: {
                createdById: session.user.id,
                title: `Demand Note for ${primaryClientName}${clients.length > 1 ? ` and ${clients.length - 1} more` : ""}`,
                description: description || null,
                totalAmount,
                dueDate: dueDateValue,
                status,
                defendantName,
                defendantPhoneEmail,
                claimNumber,
                insuranceName,
                adjuster,
                insuranceAddress,
                phone,
                fax,
                claimType,
                additionalNotes,
            },
            include: {
                clients: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });

        // � Create clients linked to this note
        for (const clientData of clients) {
            const fullName = `${clientData.salutation ? clientData.salutation + ' ' : ''}${clientData.firstName} ${clientData.middleName ? clientData.middleName + ' ' : ''}${clientData.lastName}`.trim();

            await prisma.defedantClient.create({
                data: {
                    demandNoteId: demandNote.id,
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

        // 🧾 Internal notes
        if (internalNotes) {
            await prisma.demandInternalNote.create({
                data: {
                    demandNoteId: demandNote.id,
                    createdById: session.user.id,
                    content: internalNotes,
                },
            });
        }

        // 🗂 Save uploaded files into DemandFile table
        const fileCategories = ["traffic", "medical", "bills"];

        for (const category of fileCategories) {
            const fileList = files[category] || [];

            for (const file of fileList) {
                await prisma.demandFile.create({
                    data: {
                        demandNoteId: demandNote.id,
                        fileCategory: category,        // traffic | medical | bills
                        fileName: file.name,
                        size: file.size,
                        fileUrl: file.fileUrl,        // "/uploads/fileName.pdf"
                        uploadedById: session.user.id,
                    },
                });
            }
        }

        // 📅 Timeline entry
        await prisma.demandTimeline.create({
            data: {
                demandNoteId: demandNote.id,
                type: "created",
                message: "Demand note created",
            },
        });

        // Re-fetch demand note with clients to return correct response
        const finalDemandNote = await prisma.demandNote.findUnique({
            where: { id: demandNote.id },
            include: {
                clients: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });

        console.log("✅ Demand note created with clients and files:", finalDemandNote);

        return NextResponse.json(finalDemandNote, { status: 201 });
    } catch (err: unknown) {
        console.error("❌ POST /api/demand-notes error:", err);

        const errorMessage =
            err instanceof Error ? err.message : "Unknown error occurred";

        return NextResponse.json(
            { error: "Failed to create demand note", details: errorMessage },
            { status: 500 }
        );
    }
}


export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // const canAccessAll =
        //     session.user.role === "Legacore User" ||
        //     session.user.role === "admin" ||
        //     session.user.role === "App admin";

        const canAccessAll = session.user.roles.some((role) =>
            ["Legacore User", "admin", "App admin"].includes(role)
        );

        const url = new URL(request.url);
        const pageParam = Number(url.searchParams.get("page") ?? "1");
        const limitParam = Number(url.searchParams.get("limit") ?? "10");
        const fetchFull = url.searchParams.get("full") === "true";

        const normalizedPage =
            Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
        const normalizedLimit = Number.isFinite(limitParam)
            ? Math.min(Math.max(limitParam, 1), 100)
            : 10;

        const whereClause = canAccessAll ? {} : { createdById: session.user.id };

        const total = await prisma.demandNote.count({
            where: whereClause,
        });

        const baseQuery = {
            where: whereClause,
            include: {
                clients: true,
                files: true,
            },
            orderBy: { updatedAt: "desc" } as const,
        };

        if (fetchFull) {
            const notes = await prisma.demandNote.findMany(baseQuery);
            return NextResponse.json({ notes, total });
        }

        const skip = (normalizedPage - 1) * normalizedLimit;
        const notes = await prisma.demandNote.findMany({
            ...baseQuery,
            skip,
            take: normalizedLimit,
        });

        return NextResponse.json({
            notes,
            total,
            page: normalizedPage,
            limit: normalizedLimit,
        });
    } catch (err) {
        console.error("❌ GET /api/demand-notes error:", err);
        return NextResponse.json(
            { error: "Failed to fetch demand notes" },
            { status: 500 }
        );
    }
}
