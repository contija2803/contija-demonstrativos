-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('PRESUMIDO', 'SIMPLES');

-- CreateEnum
CREATE TYPE "OrigemNf" AS ENUM ('NOVO', 'PENDENTE_ANTERIOR');

-- CreateEnum
CREATE TYPE "StatusNf" AS ENUM ('PENDENTE', 'INCLUIDA');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "profissional" TEXT NOT NULL,
    "regime" "Regime" NOT NULL,
    "aliquotaSimplesMensal" DECIMAL(6,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustoFixo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CustoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tomador" TEXT NOT NULL,
    "prestador" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "valorBruto" DECIMAL(12,2) NOT NULL,
    "irRetPct" DECIMAL(6,4),
    "issRetPct" DECIMAL(6,4),
    "incluido" BOOLEAN NOT NULL DEFAULT true,
    "origem" "OrigemNf" NOT NULL DEFAULT 'NOVO',
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusNf" NOT NULL DEFAULT 'PENDENTE',
    "historicoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Historico" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "clienteNomeSnap" TEXT NOT NULL,
    "profissionalSnap" TEXT NOT NULL,
    "regimeSnap" "Regime" NOT NULL,
    "dataGeracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultadoJson" JSONB NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "Historico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "NotaFiscal_clienteId_status_idx" ON "NotaFiscal"("clienteId", "status");

-- CreateIndex
CREATE INDEX "Historico_clienteId_dataGeracao_idx" ON "Historico"("clienteId", "dataGeracao");

-- AddForeignKey
ALTER TABLE "CustoFixo" ADD CONSTRAINT "CustoFixo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_historicoId_fkey" FOREIGN KEY ("historicoId") REFERENCES "Historico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historico" ADD CONSTRAINT "Historico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historico" ADD CONSTRAINT "Historico_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
