import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spawnPythonProcess } from "@/lib/pythonRunner";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { demandNoteId, demandFileId } = body;

        if (!demandNoteId) {
            return NextResponse.json(
                { error: "Missing required field: demandNoteId" },
                { status: 400 }
            );
        }

        // Check if demand note exists
        const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

        const demandNote = await prisma.demandNote.findFirst({
            where: {
                id: demandNoteId,
                // createdById: session.user.id,
                ...(canAccessAll ? {} : { createdById: session.user.id }),
            },
        });

        if (!demandNote) {
            return NextResponse.json(
                { error: "Demand note not found" },
                { status: 404 }
            );
        }

        // Get files for this demand note
        // If demandFileId is provided, filter for that specific file
        const files = await prisma.demandFile.findMany({
            where: {
                demandNoteId,
                id: demandFileId || undefined
            },
        });

        if (files.length === 0) {
            return NextResponse.json(
                { error: "No files found" },
                { status: 400 }
            );
        }

        // Create Job
        // const job = await prisma.job.create({
        //     data: {
        //         demandNoteId,
        //         createdById: session.user.id,
        //         status: "pending",
        //         numTasks: files.length,
        //     },
        // });

        const job = await prisma.job.upsert({
            where: {
                demandNoteId,
            },
            update: {
                publishStatus: 'draft'
            },
            create: {
                demandNoteId,
                createdById: session.user.id,
                status: "pending",
                numTasks: files.length,
                publishStatus: 'draft'
            },
        });


        // Create Tasks
        // const tasksData = files.map((file: any) => ({
        //     jobId: job.id,
        //     fileName: file.fileName,
        //     demandFileId: demandFileId,
        //     outputFilePath: file.fileUrl.split("/").slice(0, -1).join("/") + "/",
        //     filePath: file.fileUrl || "", // fallback if empty
        //     status: "pending",
        // }));

        // await prisma.task.createMany({
        //     data: tasksData,
        // });

        // Spawn Python Process
        const result = await spawnPythonProcess({
            args: [job.id],
            detached: true,
            logOutput: true,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: "Failed to spawn Python process", details: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: "Job started successfully",
        });

    } catch (error) {
        console.error("[ERROR] Job start error:", error);
        return NextResponse.json(
            { error: "Failed to start job", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
