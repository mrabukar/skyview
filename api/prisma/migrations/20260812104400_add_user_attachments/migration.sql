-- CreateTable
CREATE TABLE "user_attachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_attachment_organizationId_idx" ON "user_attachment"("organizationId");

-- CreateIndex
CREATE INDEX "user_attachment_userId_idx" ON "user_attachment"("userId");

-- AddForeignKey
ALTER TABLE "user_attachment" ADD CONSTRAINT "user_attachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attachment" ADD CONSTRAINT "user_attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attachment" ADD CONSTRAINT "user_attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
