ALTER TABLE "ClassSession" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "topicId" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "recurrenceGroupId" TEXT;

CREATE INDEX "ClassSession_subjectId_idx" ON "ClassSession"("subjectId");
CREATE INDEX "ClassSession_topicId_idx" ON "ClassSession"("topicId");
CREATE INDEX "ClassSession_recurrenceGroupId_idx" ON "ClassSession"("recurrenceGroupId");

ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;