-- CreateTable
CREATE TABLE "public"."Post" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Base',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastOpened" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Table" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Table',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "baseId" TEXT NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Column',
    "type" TEXT NOT NULL DEFAULT 'text',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "TableColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableRow" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "TableRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableCell" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tableId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,

    CONSTRAINT "TableCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."View" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Grid view',
    "type" TEXT NOT NULL DEFAULT 'grid',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tableId" TEXT NOT NULL,
    "config" JSONB,

    CONSTRAINT "View_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ViewSortRule" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ViewSortRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ViewFilterRule" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ViewFilterRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "Post_name_idx" ON "public"."Post"("name");

-- CreateIndex
CREATE INDEX "Base_createdById_idx" ON "public"."Base"("createdById");

-- CreateIndex
CREATE INDEX "Base_lastOpened_idx" ON "public"."Base"("lastOpened");

-- CreateIndex
CREATE INDEX "Base_createdById_lastOpened_idx" ON "public"."Base"("createdById", "lastOpened" DESC);

-- CreateIndex
CREATE INDEX "Table_baseId_idx" ON "public"."Table"("baseId");

-- CreateIndex
CREATE INDEX "Table_baseId_order_idx" ON "public"."Table"("baseId", "order");

-- CreateIndex
CREATE INDEX "TableColumn_tableId_idx" ON "public"."TableColumn"("tableId");

-- CreateIndex
CREATE INDEX "TableColumn_tableId_order_idx" ON "public"."TableColumn"("tableId", "order");

-- CreateIndex
CREATE INDEX "TableRow_tableId_idx" ON "public"."TableRow"("tableId");

-- CreateIndex
CREATE INDEX "TableRow_tableId_order_idx" ON "public"."TableRow"("tableId", "order");

-- CreateIndex
CREATE INDEX "TableCell_tableId_idx" ON "public"."TableCell"("tableId");

-- CreateIndex
CREATE INDEX "TableCell_rowId_idx" ON "public"."TableCell"("rowId");

-- CreateIndex
CREATE INDEX "TableCell_columnId_idx" ON "public"."TableCell"("columnId");

-- CreateIndex
CREATE UNIQUE INDEX "TableCell_tableId_rowId_columnId_key" ON "public"."TableCell"("tableId", "rowId", "columnId");

-- CreateIndex
CREATE INDEX "View_tableId_idx" ON "public"."View"("tableId");

-- CreateIndex
CREATE INDEX "View_tableId_order_idx" ON "public"."View"("tableId", "order");

-- CreateIndex
CREATE INDEX "ViewSortRule_viewId_order_idx" ON "public"."ViewSortRule"("viewId", "order");

-- CreateIndex
CREATE INDEX "ViewSortRule_viewId_columnId_idx" ON "public"."ViewSortRule"("viewId", "columnId");

-- CreateIndex
CREATE INDEX "ViewFilterRule_viewId_order_idx" ON "public"."ViewFilterRule"("viewId", "order");

-- CreateIndex
CREATE INDEX "ViewFilterRule_viewId_columnId_idx" ON "public"."ViewFilterRule"("viewId", "columnId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Base" ADD CONSTRAINT "Base_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Table" ADD CONSTRAINT "Table_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "public"."Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableColumn" ADD CONSTRAINT "TableColumn_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableRow" ADD CONSTRAINT "TableRow_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableCell" ADD CONSTRAINT "TableCell_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableCell" ADD CONSTRAINT "TableCell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "public"."TableRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableCell" ADD CONSTRAINT "TableCell_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "public"."TableColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."View" ADD CONSTRAINT "View_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ViewSortRule" ADD CONSTRAINT "ViewSortRule_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "public"."View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ViewFilterRule" ADD CONSTRAINT "ViewFilterRule_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "public"."View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
