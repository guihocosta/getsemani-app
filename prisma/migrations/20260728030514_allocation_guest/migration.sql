-- AlterTable
ALTER TABLE "Allocation" ADD COLUMN     "guestCpf" TEXT,
ADD COLUMN     "guestName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_user_xor_guest"
  CHECK ((("userId" IS NOT NULL) AND ("guestName" IS NULL))
      OR (("userId" IS NULL) AND ("guestName" IS NOT NULL)));
