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
        //     session.user.role === "Legacore User" ||
        //     session.user.role === "admin" ||
        //     session.user.role === "App admin";

         const canAccessAll = session.user.roles.some((role) =>
            ["Legacore User", "admin", "App admin"].includes(role)
        );

        const demandNote = await prisma.demandNote.findFirst({
            where: {
                id: demandNoteId,
                ...(canAccessAll ? {} : { createdById: session.user.id }),
            },
            select: { id: true },
        });

        if (!demandNote) {
            return NextResponse.json({ error: "Demand note not found" }, { status: 404 });
        }

        // Check if there's an existing combinedSummary in the Job table
        const job = await prisma.job.findUnique({
            where: { demandNoteId }
        });

        if (job?.combinedSummary) {
            return NextResponse.json({
                summaries: job.combinedSummary,
                isExisting: true,
                publishStatus: job.publishStatus || 'draft',
                status: job.status || 'pending'
            });
        }

        // Otherwise aggregate from scratch
        const files = await prisma.demandFile.findMany({
            where: { demandNoteId },
            include: {
                tasks: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                }
            }
        });

        type DemandFileWithTasks = {
            fileName: string;
            tasks?: {
                editedSummary?: string | null;
                outputSummary?: string | null;
            }[];
        };

        const summaries = files.map((file: DemandFileWithTasks) => {
            const task = file?.tasks[0];
            if (!task) return `### ${file.fileName}\n(No summary available)\n`;
            const summaryText = task.editedSummary || task.outputSummary || "(No summary available)";
            return `### ${file.fileName}\n${summaryText}\n`;
        }).join("\n---\n\n");

        // Save this initial aggregation if a job exists
        if (job) {
            await prisma.job.update({
                where: { id: job.id },
                data: { combinedSummary: summaries }
            });
        }

        return NextResponse.json({
            summaries,
            isExisting: false,
            publishStatus: job?.publishStatus || 'draft',
            status: job?.status || 'pending'
        });
    } catch (err) {
        console.error("❌ GET /api/demand-notes/[id]/draft error:", err);
        return NextResponse.json(
            { error: "Failed to fetch aggregated summaries" },
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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: demandNoteId } = await params;
        const { summaries, status, useDummy } = await request.json();

        // const canAccessAll =
        //     session.user.role === "Legacore User" ||
        //     session.user.role === "admin" ||
        //     session.user.role === "App admin";

         const canAccessAll = session.user.roles.some((role) =>
            ["Legacore User", "admin", "App admin"].includes(role)
        );

        const demandNote = await prisma.demandNote.findFirst({
            where: {
                id: demandNoteId,
                ...(canAccessAll ? {} : { createdById: session.user.id }),
            },
            select: { id: true },
        });

        if (!demandNote) {
            return NextResponse.json({ error: "Demand note not found" }, { status: 404 });
        }

        let contentToSave = summaries;
        if (useDummy) {
            contentToSave = "<p>This is a dummy consolidated summary paragraph generated for all uploaded files. It represents the collective data from the documents provided.</p>";
        }

        // Create or update Job record
        const updatedJob = await prisma.job.upsert({
            where: { demandNoteId },
            update: {
                combinedSummary: contentToSave,
                publishStatus: status || 'draft'
            },
            create: {
                demandNoteId,
                createdById: session.user.id,
                combinedSummary: contentToSave,
                publishStatus: status || 'draft',
                status: 'pending' // Default status for a new job record
            }
        });

        return NextResponse.json({ success: true, combinedSummary: updatedJob.combinedSummary, publishStatus: updatedJob.publishStatus, status: updatedJob.status });
    } catch (err) {
        console.error("❌ PUT /api/demand-notes/[id]/draft error:", err);
        return NextResponse.json(
            { error: "Failed to update draft" },
            { status: 500 }
        );
    }
}
