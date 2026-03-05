import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: fileId } = await params;

        if (!fileId) {
            return NextResponse.json(
                { error: "File ID is required" },
                { status: 400 }
            );
        }

        const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

        const task = await prisma.task.findFirst({
            where: {
                demandFileId: fileId,
                ...(canAccessAll
                    ? {}
                    : {
                        demandFile: {
                            demandNote: { createdById: session.user.id }
                        }
                    })
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                outputSummary: true,
                editedSummary: true,
                editedSummaryTs: true,
                endTs: true,
            }
        });


        if (!task) {
            return NextResponse.json({
                success: true,
                summary: null,
                editedSummary: null,
                message: "No summary found for this file"
            });
        }

        return NextResponse.json({
            success: true,
            summary: task?.outputSummary,
            editedSummary: task?.editedSummary,
            editedSummaryTs: task?.editedSummaryTs,
            summaryTs: task?.endTs,
        });

    } catch (error) {
        console.error("❌ File summary fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch file summary", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: fileId } = await params;
        const body = await request.json();
        const { summary } = body;

        if (!fileId) {
            return NextResponse.json({ error: "File ID is required" }, { status: 400 });
        }

        if (typeof summary !== 'string') {
            return NextResponse.json({ error: "Summary content is required" }, { status: 400 });
        }

        const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

        const task = await prisma.task.findFirst({
            where: {
                demandFileId: fileId,
                ...(canAccessAll
                    ? {}
                    : {
                        demandFile: {
                            demandNote: { createdById: session.user.id }
                        }
                    })
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const updatedTask = await prisma.task.update({
            where: { id: task.id },
            data: {
                editedSummary: summary,
                editedSummaryTs: new Date()
            }
        });

        await prisma.demandFile.update({
            where: { id: fileId },
            data: { summaryStatus: "summarized" }
        });

        // Update Job publishStatus to 'draft'
        const file = await prisma.demandFile.findUnique({
            where: { id: fileId },
            select: { demandNoteId: true }
        });

        if (file) {
            await prisma.job.updateMany({
                where: { demandNoteId: file.demandNoteId },
                data: { publishStatus: 'summarized' }
            });
        }

        return NextResponse.json({
            success: true,
            message: "Summary updated successfully",
            editedSummary: updatedTask?.editedSummary,
            editedSummaryTs: updatedTask?.editedSummaryTs
        });

    } catch (error) {
        console.error("❌ File summary update error:", error);
        return NextResponse.json(
            { error: "Failed to update file summary", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
