import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prompt } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAppAdminSession } from "@/lib/roles";
type CreatorName = { email?: string | null };

const formatCreatorName = (creator?: CreatorName | null) => {
  if (!creator) return null;
  const fullName = [creator.email]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
  return fullName || null;
};

const toPromptDto = (
  item: {
    id: string;
    docType: string;
    prompt: string;
    version: number;
    activeFlag: boolean;
    deletedFlag: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
  },
  createdByName: string | null
) => ({
  id: item.id,
  doc_type: item.docType,
  prompt: item.prompt,
  version: item.version,
  active_flag: item.activeFlag,
  deleted_flag: item.deletedFlag,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
  created_by: item.createdBy ?? null,
  created_by_name: createdByName,
});

const VERSION_LIMIT = 5;

async function createPromptVersion({
  docType,
  promptText,
  userId,
}: {
  docType: string;
  promptText: string;
  userId: string;
}) {
  const existing = await prisma.prompt.findMany({
    where: { docType, deletedFlag: false },
    orderBy: { createdAt: "asc" },
  });

  const highestVersion = existing.reduce(
    (max: number, item: Prompt) => Math.max(max, item.version),
    0
  );
  const nextVersion = highestVersion + 1;
  const toDeleteCount = Math.max(0, existing.length + 1 - VERSION_LIMIT);
  const toDelete = existing.slice(0, toDeleteCount);

  const created = await prisma.$transaction(async (tx) => {
    await tx.prompt.updateMany({
      where: { docType, activeFlag: true },
      data: { activeFlag: false },
    });
    const newPrompt = await tx.prompt.create({
      data: {
        docType,
        prompt: promptText,
        version: nextVersion,
        activeFlag: true,
        deletedFlag: false,
        createdBy: userId,
      },
    });
    if (toDelete.length > 0) {
      await tx.prompt.deleteMany({
        where: { id: { in: toDelete.map((item) => item.id) } },
      });
    }
    return newPrompt;
  });

  return {
    prompt: created,
    cappedToV5: toDelete.length > 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAppAdminSession(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const docType = request.nextUrl.searchParams.get("doc_type")?.trim();
    if (!docType) {
      return NextResponse.json(
        { error: "doc_type is required" },
        { status: 400 }
      );
    }

    const prompts = await prisma.prompt.findMany({
      where: { docType, deletedFlag: false },
      orderBy: [{ createdAt: "desc" }],
    });
    const creatorIds = Array.from(
      new Set(
        prompts
          .map((prompt) => prompt.createdBy)
          .filter((id): id is string => Boolean(id))
      )
    );
    const creatorMap: Record<string, CreatorName> = {};
    if (creatorIds.length > 0) {
      console.log("creatorIds", creatorIds);

      const creators = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, email: true },
      });
      creators.forEach((creator) => {
        creatorMap[creator.id] = creator;
      });

      console.log("creators", creators);

    }

    const active = prompts.find((p) => p.activeFlag && !p.deletedFlag) ?? null;

    return NextResponse.json({
      doc_type: docType,
      active_prompt: active
        ? toPromptDto(active, formatCreatorName(creatorMap[active.createdBy ?? ""]))
        : null,
      prompts: prompts.map((prompt) =>
        toPromptDto(prompt, formatCreatorName(creatorMap[prompt.createdBy ?? ""]))
      ),
    });
  } catch (error) {
    console.error("GET /api/prompts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAppAdminSession(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const normalizedDocType = String(body?.doc_type ?? "").trim();
    const normalizedPrompt = String(body?.prompt ?? "").trim();

    if (!normalizedDocType || !normalizedPrompt) {
      return NextResponse.json(
        { error: "doc_type and prompt are required" },
        { status: 400 }
      );
    }

    const { prompt: createdPrompt, cappedToV5 } = await createPromptVersion({
      docType: normalizedDocType,
      promptText: normalizedPrompt,
      userId: session.user.id,
    });

    return NextResponse.json(
      {
        prompt: toPromptDto(createdPrompt, null),
        capped_to_v5: cappedToV5,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/prompts error:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}
