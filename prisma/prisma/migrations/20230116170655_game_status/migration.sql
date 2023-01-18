-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('Created', 'Started', 'Finished', 'Cancelled');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "status" "GameStatus" DEFAULT 'Created';
