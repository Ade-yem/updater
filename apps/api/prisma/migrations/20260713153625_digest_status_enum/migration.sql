/*
  Warnings:

  - The `status` column on the `digests` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DigestStatus" AS ENUM ('processing', 'completed', 'failed', 'no_emails');

-- AlterTable
ALTER TABLE "digests" DROP COLUMN "status",
ADD COLUMN     "status" "DigestStatus" NOT NULL DEFAULT 'processing';
