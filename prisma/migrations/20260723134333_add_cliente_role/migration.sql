-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CLIENTE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clienteId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
