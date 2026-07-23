-- CreateTable
CREATE TABLE "Socio" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra o campo "profissional" existente para um Socio por Cliente, preservando os dados atuais.
INSERT INTO "Socio" ("id", "clienteId", "nome", "ativo", "createdAt")
SELECT 'socio_legacy_' || "id", "id", COALESCE(NULLIF("profissional", ''), 'Sócio principal'), true, CURRENT_TIMESTAMP
FROM "Cliente";

-- AlterTable NotaFiscal
ALTER TABLE "NotaFiscal" ADD COLUMN "descricao" TEXT,
ADD COLUMN "socioId" TEXT;

-- Vincula as notas fiscais já existentes ao sócio migrado do respectivo cliente.
UPDATE "NotaFiscal" nf SET "socioId" = 'socio_legacy_' || nf."clienteId";

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Historico
ALTER TABLE "Historico" ADD COLUMN "socioId" TEXT;

-- Vincula os históricos já existentes ao sócio migrado do respectivo cliente.
UPDATE "Historico" h SET "socioId" = 'socio_legacy_' || h."clienteId";

-- AddForeignKey
ALTER TABLE "Historico" ADD CONSTRAINT "Historico_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Cliente: o campo "profissional" agora vive em Socio.
ALTER TABLE "Cliente" DROP COLUMN "profissional";
