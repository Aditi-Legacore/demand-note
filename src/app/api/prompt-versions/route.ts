import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAppAdminSession } from "@/lib/roles";
import type { CreatorName } from "@/app/api/prompts/helpers";
import { formatCreatorName, toPromptDto } from "@/app/api/prompts/helpers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAppAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const prompts = await prisma.prompt.findMany({
      where: { deletedFlag: false },
      orderBy: [{ createdAt: "desc" }],
    });

    const creatorIds = Array.from(
      new Set(
        prompts
          .map((prompt) => prompt.createdBy)
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      )
    );

    const creatorMap: Record<string, CreatorName> = {};
    if (creatorIds.length > 0) {
      const creators = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, email: true },
      });
      creators.forEach((creator) => {
        creatorMap[creator.id] = creator;
      });
    }

    const promptVersions = prompts.map((prompt) =>
      toPromptDto(prompt, formatCreatorName(creatorMap[prompt.createdBy ?? ""]))
    );

    return NextResponse.json({ promptVersions });
  } catch (error) {
    console.error("GET /api/prompt-versions error:", error);
    return NextResponse.json(
      { error: "Failed to load prompt versions" },
      { status: 500 }
    );
  }
}
