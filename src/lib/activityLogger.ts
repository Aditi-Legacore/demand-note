import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function logActivity({
  refId,
  activityType,
  shortDescription,
  longDescription,
}: {
  refId: string;
  activityType: string;
  shortDescription: string;
  longDescription: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    let createdBy = "embedded"; // Default for embedded forms
    let userName = "Embedded User";

    if (session?.user?.id) {
      // Fetch user details if session exists
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, uniqueUserId: true },
      });

      if (user?.uniqueUserId) {
        createdBy = user.uniqueUserId;
        userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      }
    }

    // 🔍 Find IntakeInfo by ID (refId is the intake ID)
    const intake = await prisma.intakeInfo.findUnique({
      where: { id: refId },
      select: { id: true, referenceId: true },
    });

    if (!intake) {
      console.warn(`⚠️ No IntakeInfo found for ID: ${refId}`);
      return;
    }

    // 📝 Construct full long description
    const fullLongDescription = `${userName} (${createdBy}) - Intake ${intake.referenceId || refId}: ${longDescription}`;

    // ✅ Create activity log with intakeId
    await prisma.activityLog.create({
      data: {
        intakeId: intake.id,
        activityType,
        shortDescription,
        longDescription: fullLongDescription,
        createdBy,
      },
    });

    console.log(`✅ Activity log created (intakeId: ${intake.id})`);
  } catch (error) {
    console.error("❌ Error logging activity:", error);
  }
}
