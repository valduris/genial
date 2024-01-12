-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('Created', 'Started', 'Finished', 'Cancelled');

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boardSize" INTEGER NOT NULL DEFAULT 6,
    "playerCount" INTEGER NOT NULL DEFAULT 2,
    "hexyPairs" JSONB NOT NULL DEFAULT '[]',
    "name" VARCHAR(255) NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'Created',
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "showProgress" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT,
    "gameId" INTEGER,
    "name" TEXT,
    "progress" JSONB NOT NULL DEFAULT '[]',
    "password" TEXT,
    "ready" BOOLEAN DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_uuid_key" ON "Game"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
