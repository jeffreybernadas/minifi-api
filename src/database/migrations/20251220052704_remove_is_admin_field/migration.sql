/*
  Warnings:

  - You are about to drop the column `isAdmin` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_isAdmin_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isAdmin";
