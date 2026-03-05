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
            include: {
                clients: true,
                files: {
                    include: {
                        tasks: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        if (!demandNote) {
            return NextResponse.json({ error: "Demand note not found" }, { status: 404 });
        }

        // 1. Check DemandFile summaryStatus == "not_summarized"
        const unsummarizedFiles = demandNote.files.filter(f => f.summaryStatus !== "summarized");
        const allFilesSummarized = unsummarizedFiles.length === 0;

        // 2. Check Task -> editedSummaryTs match with endTs (using a small buffer if needed, but here we just check if editedSummary exists)
        // The requirement says: check Task tbl -> editedSummaryTs time and endTs time match with current time
        // Interpreting "match with current time" as "is it relatively fresh or synced"
        // 2. Check Task -> editedSummaryTs match with endTs
        const tasksSynced = demandNote.files.every(f => {
            const task = f.tasks[0];
            if (!task) return false;
            if (task.status !== "completed") return false;

            // If there's a final summary and an edited version, check if the edited version is newer or equal to the AI summary
            if (task.endTs && task.editedSummaryTs) {
                return new Date(task.editedSummaryTs) >= new Date(task.endTs);
            }

            // If never edited but completed, it's considered synced for now but might need manual check
            return true;
        });

        const isPublishable = allFilesSummarized && tasksSynced;

        return NextResponse.json({
            isPublishable,
            details: {
                allFilesSummarized,
                tasksSynced,
                unsummarizedCount: unsummarizedFiles.length,
                // clientName: demandNote.client.name,
                // clientUpdatedAt: demandNote.client.updatedAt
            }
        });
    } catch (err) {
        console.error("❌ GET /api/demand-notes/[id]/publish/status error:", err);
        return NextResponse.json(
            { error: "Failed to check publish status" },
            { status: 500 }
        );
    }
}
