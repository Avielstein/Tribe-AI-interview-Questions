-- CreateTable
CREATE TABLE "intakes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget_range" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "ai_status" TEXT NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "tags" JSONB,
    "risks" JSONB,
    "ai_error" TEXT,
    "ai_attempts" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "intakes_created_at_idx" ON "intakes"("created_at");
