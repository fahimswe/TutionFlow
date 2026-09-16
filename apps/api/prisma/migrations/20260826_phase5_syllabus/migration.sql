ALTER TABLE "Subject" ADD COLUMN "tutorId" TEXT;

UPDATE "Subject" AS subject
SET "tutorId" = assignment."tutorId"
FROM (
    SELECT DISTINCT ON (batch_subject."subjectId") batch_subject."subjectId", batch."tutorId"
    FROM "BatchSubject" AS batch_subject
    INNER JOIN "Batch" AS batch ON batch."id" = batch_subject."batchId"
    ORDER BY batch_subject."subjectId", batch_subject."createdAt"
) AS assignment
WHERE subject."id" = assignment."subjectId";

UPDATE "Subject"
SET "tutorId" = (SELECT "id" FROM "Tutor" ORDER BY "createdAt" LIMIT 1)
WHERE "tutorId" IS NULL;

ALTER TABLE "Subject" ALTER COLUMN "tutorId" SET NOT NULL;
CREATE INDEX "Subject_tutorId_idx" ON "Subject"("tutorId");
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;