/*
  Warnings:

  - You are about to drop the column `color` on the `Base` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Base" DROP COLUMN "color";

-- AlterTable
ALTER TABLE "public"."ViewFilterRule" ADD COLUMN     "logicalOperator" TEXT;
