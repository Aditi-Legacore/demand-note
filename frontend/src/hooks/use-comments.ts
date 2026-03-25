import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { SummaryCommentWithUser } from "@/types/summary";
import {
  COMMENTS_ACCESS_DENIED_MESSAGE,
  hasCommentAccess,
} from "@/lib/comment-access";

const sortComments = (items: SummaryCommentWithUser[]) =>
  [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

export function useSummaryComments(taskId?: string | null) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<SummaryCommentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowCommentAccess = hasCommentAccess(session?.user?.roles ?? []);

  const fetchComments = useCallback(async () => {
    if (!taskId) {
      setComments([]);
      setError(null);
      return;
    }

    if (!allowCommentAccess) {
      setComments([]);
      setError(COMMENTS_ACCESS_DENIED_MESSAGE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ taskId });
      const response = await fetch(`/api/comments?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load comments");
      }

      setComments(sortComments(data?.comments ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [taskId, allowCommentAccess]);

  const optimisticUser = useMemo(() => {
    const user = session?.user;
    if (!user) return null;
    return {
      id: user.id,
      firstName: user.name ?? null,
      lastName: null,
      email: user.email ?? null,
    };
  }, [session?.user]);

  const addComment = useCallback(
    async (value: string) => {
      if (!taskId) {
        throw new Error("Task is not selected");
      }
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error("Comment cannot be empty");
      }

      if (!allowCommentAccess) {
        throw new Error(COMMENTS_ACCESS_DENIED_MESSAGE);
      }

      setIsPosting(true);
      const tempId = `temp-${Date.now()}`;
      const fallbackUser =
        optimisticUser ?? {
          id: tempId,
          firstName: session?.user?.email ?? "You",
          lastName: null,
          email: session?.user?.email ?? null,
        };

      const optimisticComment: SummaryCommentWithUser = {
        id: tempId,
        comment: trimmed,
        createdAt: new Date().toISOString(),
        user: fallbackUser,
        promptId: null,
      };

      setComments((prev) => sortComments([optimisticComment, ...prev]));

      try {
        const response = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, comment: trimmed }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to save comment");
        }

        const savedComment: SummaryCommentWithUser = data.comment;
        setComments((prev) =>
          sortComments(prev.map((item) => (item.id === tempId ? savedComment : item)))
        );
        return savedComment;
      } catch (err) {
        setComments((prev) => prev.filter((item) => item.id !== tempId));
        throw err;
      } finally {
        setIsPosting(false);
      }
    },
    [taskId, optimisticUser, session?.user, allowCommentAccess]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    if (!commentId) {
      throw new Error("commentId is required");
    }

    if (!allowCommentAccess) {
      throw new Error(COMMENTS_ACCESS_DENIED_MESSAGE);
    }

    setDeletingCommentId(commentId);

    let previousComments: SummaryCommentWithUser[] | null = null;
    setComments((prev) => {
      previousComments = prev;
      return prev.filter((item) => item.id !== commentId);
    });

    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete comment");
      }
    } catch (err) {
      if (previousComments) {
        setComments(previousComments);
      }
      throw err;
    } finally {
      setDeletingCommentId((current) =>
        current === commentId ? null : current
      );
    }
  }, [allowCommentAccess]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  return {
    comments,
    isLoading,
    isPosting,
    error,
    refresh: fetchComments,
    addComment,
    deleteComment,
    deletingCommentId,
  };
}
