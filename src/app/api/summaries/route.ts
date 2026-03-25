import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["Legacore User", "admin", "App admin"];

const safeDate = (value: string | null, endOfDay = false) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const fromDateValue = safeDate(url.searchParams.get("fromDate"));
  const toDateValue = safeDate(url.searchParams.get("toDate"), true);
  const promptVersionId = url.searchParams.get("promptVersionId")?.trim();

  const canAccessAll = session.user.roles.some((role) => ADMIN_ROLES.includes(role));
  const filtersActive = Boolean(fromDateValue || toDateValue || promptVersionId);

  if (!filtersActive) {
    return NextResponse.json({ summaries: [] });
  }

  const commentDateFilter: Prisma.DateTimeFilter = {};
  if (fromDateValue) commentDateFilter.gte = fromDateValue;
  if (toDateValue) commentDateFilter.lte = toDateValue;

  const taskAccessFilter: Prisma.TaskWhereInput = canAccessAll
    ? {}
    : {
        demandFile: {
          demandNote: {
            createdById: session.user.id,
          },
        },
      };

  const commentWhere: Prisma.SummaryCommentWhereInput = {};
  if (fromDateValue || toDateValue) {
    commentWhere.createdAt = commentDateFilter;
  }
  if (Object.keys(taskAccessFilter).length > 0) {
    commentWhere.task = taskAccessFilter;
  }
  if (promptVersionId) {
    commentWhere.promptId = promptVersionId;
  }

  try {
    const comments = await prisma.summaryComment.findMany({
      where: commentWhere,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            createdAt: true,
            promptVersionId: true,
            editedSummary: true,
            outputSummary: true,
            demandFile: {
              select: {
                demandNoteId: true,
                demandNote: {
                  select: {
                    id: true,
                    clientName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const promptIdsForVersion = Array.from(
      new Set(
        comments
          .map((comment) => comment.promptId ?? comment.task?.promptVersionId)
          .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      )
    );

    const promptVersions =
      promptIdsForVersion.length > 0
        ? await prisma.prompt.findMany({
            where: { id: { in: promptIdsForVersion } },
            select: { id: true, version: true },
          })
        : [];

    const promptVersionNumberMap = new Map(
      promptVersions.map((prompt) => [prompt.id, prompt.version])
    );

    const summaryRows = comments.map((comment) => {
      const task = comment.task;
      const demandNote =
        task?.demandFile?.demandNote
          ? {
              id: task.demandFile.demandNote.id,
              clientName: task.demandFile.demandNote.clientName ?? null,
            }
          : null;

      const demandFileInfo = task?.demandFile
        ? {
            demandNoteId: task.demandFile.demandNoteId ?? null,
            clientName: task.demandFile.demandNote?.clientName ?? null,
          }
        : null;

      const resolvedPromptId = comment.promptId ?? task?.promptVersionId ?? null;

      return {
        id: comment.id,
        createdAt: comment.createdAt.toISOString(),
        comment: comment.comment,
        user: comment.user
          ? {
              id: comment.user.id,
              firstName: comment.user.firstName,
              lastName: comment.user.lastName,
              email: comment.user.email,
            }
          : null,
        promptId: comment.promptId ?? null,
        promptVersionId: task?.promptVersionId ?? null,
        promptVersionNumber:
          resolvedPromptId && promptVersionNumberMap.has(resolvedPromptId)
            ? promptVersionNumberMap.get(resolvedPromptId) ?? null
            : null,
        editedSummary: task?.editedSummary ?? null,
        outputSummary: task?.outputSummary ?? null,
        demandNote,
        demandFile: demandFileInfo,
      };
    });

    return NextResponse.json({ summaries: summaryRows });

  } catch (err) {
    console.error("Failed to load summaries", err);
    return NextResponse.json({ error: "Failed to load summaries" }, { status: 500 });
  }
}
