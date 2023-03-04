/*
  Warnings:

  - You are about to drop the column `bio` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `turn` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_gameId_fkey";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "players" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "bio";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "turn";
