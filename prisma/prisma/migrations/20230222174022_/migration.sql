/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Game_uuid_key" ON "Game"("uuid");
