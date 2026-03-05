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
  request: NextRequest,
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
    const body = await request.json();
    const promptText = String(body?.prompt ?? "").trim();
    if (!promptText) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const existing = await prisma.prompt.findUnique({ where: { id } });
    if (!existing || existing.deletedFlag) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const versions = await prisma.prompt.findMany({
      where: { docType: existing.docType },
      select: { id: true, version: true },
      orderBy: { version: "desc" },
    });

    const latestVersion = versions[0]?.version ?? 0;
    const cappedAtV5 = latestVersion >= 5;

    if (cappedAtV5) {
      const v5Target = versions.find((v) => v.version === 5) ?? versions[0];

      const [, updatedV5] = await prisma.$transaction([
        prisma.prompt.updateMany({
          where: { docType: existing.docType, activeFlag: true },
          data: { activeFlag: false },
        }),
        prisma.prompt.update({
          where: { id: v5Target.id },
          data: {
            prompt: promptText,
            activeFlag: true,
            deletedFlag: false,
          },
        }),
      ]);

      return NextResponse.json({
        prompt: toPromptDto(updatedV5),
        capped_to_v5: true,
      });
    }

    const nextVersion = latestVersion + 1;
    const [, created] = await prisma.$transaction([
      prisma.prompt.updateMany({
        where: { docType: existing.docType, activeFlag: true },
        data: { activeFlag: false },
      }),
      prisma.prompt.create({
        data: {
          docType: existing.docType,
          prompt: promptText,
          version: nextVersion,
          activeFlag: true,
        },
      }),
    ]);

    return NextResponse.json({
      prompt: toPromptDto(created),
      capped_to_v5: false,
    });
  } catch (error) {
    console.error("PUT /api/prompts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const existing = await prisma.prompt.findUnique({ where: { id } });
    if (!existing || existing.deletedFlag) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (!existing.activeFlag) {
      await prisma.prompt.update({
        where: { id },
        data: {
          deletedFlag: true,
          activeFlag: false,
        },
      });
      return NextResponse.json({ success: true });
    }

    const nextActive = await prisma.prompt.findFirst({
      where: {
        docType: existing.docType,
        deletedFlag: false,
        id: { not: id },
      },
      orderBy: { version: "desc" },
    });

    if (!nextActive) {
      throw new Error(
        "Cannot delete the only active prompt version for this doc_type"
      );
    }

    await prisma.$transaction([
      prisma.prompt.update({
        where: { id },
        data: {
          deletedFlag: true,
          activeFlag: false,
        },
      }),
      prisma.prompt.updateMany({
        where: { docType: existing.docType, activeFlag: true },
        data: { activeFlag: false },
      }),
      prisma.prompt.update({
        where: { id: nextActive.id },
        data: { activeFlag: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot delete the only active prompt version")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("DELETE /api/prompts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
