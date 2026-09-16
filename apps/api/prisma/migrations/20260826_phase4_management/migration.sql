ALTER TABLE "Student" ADD COLUMN "tutorId" TEXT;

ALTER TABLE "Batch" ADD COLUMN "academicYear" TEXT;
ALTER TABLE "Batch" ADD COLUMN "description" TEXT;

UPDATE "Student" AS student
SET "tutorId" = assignment."tutorId"
FROM (
	SELECT DISTINCT ON (enrollment."studentId") enrollment."studentId", batch."tutorId"
	FROM "Enrollment" AS enrollment
	INNER JOIN "Batch" AS batch ON batch."id" = enrollment."batchId"
	ORDER BY enrollment."studentId", enrollment."createdAt"
) AS assignment
WHERE student."id" = assignment."studentId";

UPDATE "Student"
SET "tutorId" = (SELECT "id" FROM "Tutor" ORDER BY "createdAt" LIMIT 1)
WHERE "tutorId" IS NULL;

UPDATE "Batch" SET "academicYear" = '2026' WHERE "academicYear" IS NULL;

ALTER TABLE "Student" ALTER COLUMN "tutorId" SET NOT NULL;
ALTER TABLE "Batch" ALTER COLUMN "academicYear" SET NOT NULL;

CREATE INDEX "Student_tutorId_idx" ON "Student"("tutorId");

ALTER TABLE "Student" ADD CONSTRAINT "Student_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;