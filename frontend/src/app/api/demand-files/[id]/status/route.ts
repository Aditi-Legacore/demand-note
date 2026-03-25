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

        // Find the latest job for this file
        // const job = await prisma.job.findFirst({
        //     where: {
        //         // demandFileId: fileId,
        //         createdById: session.user.id,
        //     },
        //     orderBy: {
        //         createTs: 'desc',
        //     },
        //     include: {
        //         tasks: {
        //             where: {
        //                 demandFileId: fileId
        //             },
        //             orderBy: {
        //                 id: 'asc',
        //             },
        //         },
        //     },
        // });

        const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

        const job = await prisma.job.findFirst({
            where: {
                tasks: {
                    some: {
                        demandFileId: fileId,
                        ...(canAccessAll
                            ? {}
                            : {
                                demandFile: {
                                    demandNote: { createdById: session.user.id }
                                }
                            }),
                    },
                },
            },
            orderBy: {
                createTs: "desc",
            },
            include: {
                tasks: {
                    where: {
                        demandFileId: fileId,
                    },
                    orderBy: {
                        id: "asc",
                    },
                },
            },
        });


        if (!job) {
            return NextResponse.json({
                success: true,
                job: null,
                message: "No job found for this file"
            });
        }

        return NextResponse.json({
            success: true,
            job,
        });

    } catch (error) {
        console.error("❌ File job status error:", error);
        return NextResponse.json(
            { error: "Failed to fetch file job status", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
