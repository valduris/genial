/*
  Warnings:

  - You are about to drop the column `players` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_userId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "players",
DROP COLUMN "progress";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gameId" INTEGER,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "progress" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "email" DROP NOT NULL;

-- DropTable
DROP TABLE "Profile";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
