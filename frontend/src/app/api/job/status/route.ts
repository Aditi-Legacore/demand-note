import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get("jobId");

        if (!jobId) {
            return NextResponse.json(
                { error: "Missing required query parameter: jobId" },
                { status: 400 }
            );
        }

        const job = await prisma.job.findFirst({
            where: {
                id: jobId,
            },
            include: {
                demandNote: {
                    select: { createdById: true }
                },
                tasks: {
                    orderBy: {
                        id: 'asc'
                    }
                }
            }
        });

        if (!job) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        const canAccessAll = (session.user.roles ?? []).some((role) =>
            ["Legacore User", "admin", "App admin"].includes(role)
        );

        if (!canAccessAll && job.demandNote?.createdById !== session.user.id) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            job,
        });

    } catch (error) {
        console.error("❌ Job status error:", error);
        return NextResponse.json(
            { error: "Failed to fetch job status", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
