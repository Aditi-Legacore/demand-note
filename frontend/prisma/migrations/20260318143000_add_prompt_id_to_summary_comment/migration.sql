ALTER TABLE "SummaryComment"
ADD COLUMN "promptId" TEXT;

ALTER TABLE "SummaryComment"
ADD CONSTRAINT "SummaryComment_promptId_fkey"
FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SummaryComment_promptId_idx" ON "SummaryComment"("promptId");
