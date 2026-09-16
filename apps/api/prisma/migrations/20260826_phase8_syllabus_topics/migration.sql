ALTER TABLE "ExamSyllabus" ADD COLUMN "topicId" TEXT;
DROP INDEX "ExamSyllabus_examId_subjectId_chapterId_key";
CREATE UNIQUE INDEX "ExamSyllabus_examId_subjectId_chapterId_topicId_key" ON "ExamSyllabus"("examId", "subjectId", "chapterId", "topicId");
CREATE INDEX "ExamSyllabus_topicId_idx" ON "ExamSyllabus"("topicId");
ALTER TABLE "ExamSyllabus" ADD CONSTRAINT "ExamSyllabus_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;