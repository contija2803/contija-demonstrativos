-- CreateEnum
CREATE TYPE "TipoTomador" AS ENUM ('PF', 'PJ');

-- AlterTable
ALTER TABLE "CustoFixo" ADD COLUMN     "socioId" TEXT;

-- AlterTable
ALTER TABLE "NotaFiscal" ADD COLUMN     "tipoTomador" "TipoTomador";

-- AddForeignKey
ALTER TABLE "CustoFixo" ADD CONSTRAINT "CustoFixo_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
