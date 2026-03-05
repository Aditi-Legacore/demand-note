import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { promises as fs } from "fs";
import path from "path";
import { authOptions } from "@/lib/auth";
import { isAppAdminSession } from "@/lib/roles";

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
    const promptId = String(body?.prompt_id ?? "").trim();
    const docType = String(body?.doc_type ?? "").trim();
    const version = Number(body?.version);

    if (!promptId || !docType || !Number.isFinite(version)) {
      return NextResponse.json(
        { error: "prompt_id, doc_type, and version are required" },
        { status: 400 }
      );
    }

    const occurredAt = new Date().toISOString();
    const auditEntry = {
      event: "prompt_revert_loaded",
      promptId,
      docType,
      version,
      revertedBy: session.user.id,
      revertedByEmail: session.user.email ?? null,
      revertedByRole: session.user.role ?? null,
      occurredAt,
    };

    const logDir = path.join(process.cwd(), "logs");
    const logPath = path.join(logDir, "prompt-revert-audit.log");
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(logPath, `${JSON.stringify(auditEntry)}\n`, "utf8");

    console.info("[PromptRevertAudit]", auditEntry);

    return NextResponse.json({ success: true, occurred_at: occurredAt });
  } catch (error) {
    console.error("POST /api/prompts/revert-audit error:", error);
    return NextResponse.json(
      { error: "Failed to write revert audit log" },
      { status: 500 }
    );
  }
}
