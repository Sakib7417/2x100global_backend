-- AlterTable
ALTER TABLE "users" ALTER COLUMN "rank" SET DEFAULT 'NONE';

-- LV1 was previously auto-assigned to every user. Reset unearned LV1 ranks
-- so LV1 (and its bonus) can be earned through rank evaluation.
UPDATE "users" SET "rank" = 'NONE' WHERE "rank" = 'LV1';
