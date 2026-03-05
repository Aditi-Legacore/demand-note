import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAppAdminSession } from "@/lib/roles";

const toPromptDto = (item: {
  id: string;
  docType: string;
  prompt: string;
  version: number;
  activeFlag: boolean;
  deletedFlag: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: item.id,
  doc_type: item.docType,
  prompt: item.prompt,
  version: item.version,
  active_flag: item.activeFlag,
  deleted_flag: item.deletedFlag,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
});

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAppAdminSession(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const target = await prisma.prompt.findUnique({ where: { id } });
    if (!target || target.deletedFlag) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (!target.activeFlag) {
      return NextResponse.json({
        prompt: toPromptDto(target),
        message: "Prompt is already inactive",
      });
    }

    const nextActive = await prisma.prompt.findFirst({
      where: {
        docType: target.docType,
        deletedFlag: false,
        id: { not: id },
      },
      orderBy: { version: "desc" },
    });

    if (!nextActive) {
      return NextResponse.json(
        { error: "Cannot inactivate the only active prompt for this doc_type" },
        { status: 400 }
      );
    }

    const [deactivatedPrompt, activatedPrompt] = await prisma.$transaction([
      prisma.prompt.update({
        where: { id },
        data: { activeFlag: false },
      }),
      prisma.prompt.update({
        where: { id: nextActive.id },
        data: { activeFlag: true },
      }),
    ]);

    return NextResponse.json({
      prompt: toPromptDto(deactivatedPrompt),
      activated_prompt: toPromptDto(activatedPrompt),
    });
  } catch (error) {
    console.error("PUT /api/prompts/[id]/deactivate error:", error);
    return NextResponse.json(
      { error: "Failed to inactivate prompt version" },
      { status: 500 }
    );
  }
}
