import type { Prisma, Prompt } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type CreatorName = { email?: string | null };

export const formatCreatorName = (creator?: CreatorName | null) => {
  if (!creator) return null;
  const fullName = [creator.email]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
  return fullName || null;
};

export const toPromptDto = (
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

export async function createPromptVersion({
  docType,
  promptText,
  userId,
}: {
  docType: string;
  promptText: string;
  userId: string;
}) {
  const existing = await prisma.prompt.findMany({
    where: { docType },
    orderBy: { createdAt: "asc" },
  });

  const highestVersion = existing.reduce(
    (max, item) => Math.max(max, item.version),
    0
  );
  const nextVersion = highestVersion + 1;
  const toDeleteCount = Math.max(0, existing.length + 1 - VERSION_LIMIT);
  const toDelete = existing.slice(0, toDeleteCount);

  const statements: [
    Prisma.PrismaPromise<Prisma.BatchPayload>,
    Prisma.PrismaPromise<Prompt>
  ] = [
    prisma.prompt.updateMany({
      where: { docType, activeFlag: true },
      data: { activeFlag: false },
    }),
    prisma.prompt.create({
      data: {
        docType,
        prompt: promptText,
        version: nextVersion,
        activeFlag: true,
        deletedFlag: false,
        createdBy: userId,
      },
    }),
  ];

  const [, created] = await prisma.$transaction(statements);
  return {
    prompt: created,
    cappedToV5: toDelete.length > 0,
  };
}
