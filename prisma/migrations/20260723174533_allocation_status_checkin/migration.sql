-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- AlterTable
ALTER TABLE "Allocation" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AllocationStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill: alocacoes criadas antes do ciclo de confirmacao existir ja estavam
-- de fato confirmadas (o app nao tinha o conceito de pendente). Sem isso, o
-- default PENDING faria essas pessoas receberem cobranca de confirmacao
-- retroativa para escalas ja combinadas.
UPDATE "Allocation" SET "status" = 'CONFIRMED', "respondedAt" = "createdAt";
