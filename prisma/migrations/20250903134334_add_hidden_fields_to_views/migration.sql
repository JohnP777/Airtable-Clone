/*
  Warnings:

  - You are about to drop the `ViewHiddenField` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ViewHiddenField" DROP CONSTRAINT "ViewHiddenField_viewId_fkey";

-- AlterTable
ALTER TABLE "public"."View" ADD COLUMN     "hiddenFields" TEXT[];

-- DropTable
DROP TABLE "public"."ViewHiddenField";
