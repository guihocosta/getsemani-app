-- AlterTable
ALTER TABLE "SwapRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSkill_roleId_idx" ON "UserSkill"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_roleId_key" ON "UserSkill"("userId", "roleId");

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
