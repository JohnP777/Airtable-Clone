-- CreateTable
CREATE TABLE "public"."ViewRowOrder" (
    "viewId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ViewRowOrder_pkey" PRIMARY KEY ("viewId","rowId")
);

-- CreateIndex
CREATE INDEX "ViewRowOrder_viewId_position_idx" ON "public"."ViewRowOrder"("viewId", "position");

-- AddForeignKey
ALTER TABLE "public"."ViewRowOrder" ADD CONSTRAINT "ViewRowOrder_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "public"."View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ViewRowOrder" ADD CONSTRAINT "ViewRowOrder_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "public"."TableRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
