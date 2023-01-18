/*
  Warnings:

  - Made the column `status` on table `Game` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Game" ALTER COLUMN "status" SET NOT NULL;
