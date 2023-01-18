/*
  Warnings:

  - You are about to drop the column `board` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "board",
ADD COLUMN     "hexyPairs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "progress" JSONB NOT NULL DEFAULT '[]';
