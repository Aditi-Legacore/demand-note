CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active_flag" BOOLEAN NOT NULL DEFAULT false,
    "deleted_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Prompt_doc_type_version_key" ON "Prompt"("doc_type", "version");
CREATE INDEX "Prompt_doc_type_idx" ON "Prompt"("doc_type");
CREATE INDEX "Prompt_doc_type_active_flag_idx" ON "Prompt"("doc_type", "active_flag");

-- Enforce only one active, non-deleted prompt per doc_type.
CREATE UNIQUE INDEX "Prompt_single_active_per_doc_type_key"
ON "Prompt"("doc_type")
WHERE "active_flag" = true AND "deleted_flag" = false;
