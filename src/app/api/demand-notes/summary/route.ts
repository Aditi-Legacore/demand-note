import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    const whereClause = canAccessAll ? {} : { createdById: session.user.id };

    const [total, grouped] = await Promise.all([
      prisma.demandNote.count({ where: whereClause }),
      prisma.demandNote.groupBy({
        by: ["status"],
        where: whereClause,
        _count: { _all: true },
      }),
    ]);

    const statusCounts = grouped.reduce<Record<string, number>>(
      (acc: Record<string, number>, item) => {
      const key = (item.status ?? "").toLowerCase();
      acc[key] = item._count._all;
      return acc;
    },
    {} as Record<string, number>);

    return NextResponse.json({
      total,
      initiated: statusCounts["initiated"] ?? 0,
      generated: statusCounts["generated"] ?? 0,
      published: statusCounts["sent"] ?? 0,
    });
  } catch (err) {
    console.error("❌ GET /api/demand-notes/summary error:", err);
    return NextResponse.json(
      { error: "Failed to load demand note summary" },
      { status: 500 }
    );
  }
}
