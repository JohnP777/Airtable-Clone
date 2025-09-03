-- CreateTable
CREATE TABLE "public"."ViewHiddenField" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ViewHiddenField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewHiddenField_viewId_order_idx" ON "public"."ViewHiddenField"("viewId", "order");

-- CreateIndex
CREATE INDEX "ViewHiddenField_viewId_columnId_idx" ON "public"."ViewHiddenField"("viewId", "columnId");

-- AddForeignKey
ALTER TABLE "public"."ViewHiddenField" ADD CONSTRAINT "ViewHiddenField_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "public"."View"("id") ON DELETE CASCADE ON UPDATE CASCADE;
