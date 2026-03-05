import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";

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
        const pythonScriptPath = "D:\\demandnote\\backend\\pipeline\\main.py";
        const pythonExecutable = "C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";

        console.log("🐍 Spawning Python process...");
        console.log("   Executable:", pythonExecutable);
        console.log("   Script:", pythonScriptPath);
        console.log("   Job ID:", job.id);

        const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, job.id], {
            shell: true, // Important for Windows
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        pythonProcess.on('error', (err) => {
            console.error('❌ Failed to start Python process:', err);
        });

        pythonProcess.on('spawn', () => {
            console.log('✅ Python process spawned successfully, PID:', pythonProcess.pid);
        });

        pythonProcess.stdout?.on('data', (data) => {
            console.log(`🐍 [STDOUT]: ${data.toString().trim()}`);
        });

        pythonProcess.stderr?.on('data', (data) => {
            console.error(`🐍 [STDERR]: ${data.toString().trim()}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`🐍 Python process exited with code ${code}`);
        });

        pythonProcess.unref(); // Allow node process to complete without waiting for python child

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: "Job started successfully",
        });

    } catch (error) {
        console.error("❌ Job start error:", error);
        return NextResponse.json(
            { error: "Failed to start job", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
