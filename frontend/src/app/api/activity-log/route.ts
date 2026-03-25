import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { intakeId, refId, activityType, shortDescription, longDescription } = body;

    // ✅ Validation
    if (!activityType?.trim() || !shortDescription?.trim() || !longDescription?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ Call activity logger
    await logActivity({
      // use refId if provided, otherwise fall back to intakeId
      refId: refId ?? intakeId,
      activityType,
      shortDescription,
      longDescription,
    });

    return NextResponse.json({ message: "Activity logged successfully" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error in /api/activity-log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
