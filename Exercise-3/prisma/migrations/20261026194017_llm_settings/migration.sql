-- AlterTable
ALTER TABLE "intakes" ADD COLUMN "ai_error_code" TEXT;

-- CreateTable
CREATE TABLE "llm_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "api_key" TEXT,
    "key_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "key_error" TEXT,
    "checked_at" DATETIME,
    "updated_at" DATETIME NOT NULL
);
