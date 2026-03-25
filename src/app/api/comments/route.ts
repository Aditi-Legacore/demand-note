import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  COMMENTS_ACCESS_DENIED_MESSAGE,
  hasCommentAccess,
} from "@/lib/comment-access";

type CommentWithUser = {
  id: string;
  comment: string;
  createdAt: Date;
  promptId: string | null;
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

const mapComment = (comment: CommentWithUser) => ({
  id: comment.id,
  comment: comment.comment,
  createdAt: comment.createdAt.toISOString(),
  promptId: comment.promptId ?? null,
  user: comment.user
    ? {
        id: comment.user.id,
        firstName: comment.user.firstName,
        lastName: comment.user.lastName,
        email: comment.user.email,
      }
    : null,
});

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const forbidden = () =>
  NextResponse.json({ error: COMMENTS_ACCESS_DENIED_MESSAGE }, { status: 403 });

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  if (!hasCommentAccess(session.user.roles ?? [])) {
    return forbidden();
  }

  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId")?.trim();
  if (!taskId) {
    // Nothing to load without a task identifier.
    return NextResponse.json({ comments: [] });
  }

  try {
    const comments = await prisma.summaryComment.findMany({
      where: { taskId },
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
      },
    });

    return NextResponse.json({ comments: comments.map(mapComment) });
  } catch (error) {
    console.error("Failed to load summary comments", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  if (!hasCommentAccess(session.user.roles ?? [])) {
    return forbidden();
  }

  let body: { taskId?: string; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const taskId = body.taskId?.trim();
  const commentText = body.comment?.trim();

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  if (!commentText) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        demandFile: {
          select: { demandNoteId: true},
        },
        promptVersionId: true
      },
    });
    // const demandNoteId = task?.demandFile?.demandNoteId ?? null;
    // console.log("task?.demandFile?.demandNoteId", task?.demandFile?.demandNoteId, );
    
    const created = await prisma.summaryComment.create({
      data: {
        taskId,
        userId: session.user.id,
        comment: commentText,
        demandNoteId: task?.demandFile?.demandNoteId ?? null,
        promptId: task?.promptVersionId ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ comment: mapComment(created) });
  } catch (error) {
    console.error("Failed to save summary comment", error);
    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized();
  }

  if (!hasCommentAccess(session.user.roles ?? [])) {
    return forbidden();
  }

  let body: { commentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const commentId = body.commentId?.trim();
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.summaryComment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
    }

    await prisma.summaryComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete summary comment", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
