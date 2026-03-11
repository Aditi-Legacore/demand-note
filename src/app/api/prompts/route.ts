import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAppAdminSession } from "@/lib/roles";
import {
  CreatorName,
  formatCreatorName,
  toPromptDto,
  createPromptVersion,
} from "./helpers";

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

