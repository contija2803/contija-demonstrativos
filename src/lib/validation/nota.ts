import { z } from "zod";

export const notaFiscalDraftSchema = z.object({
  tomador: z.string().default(""),
  prestador: z.string().default(""),
  numero: z.string().default(""),
  data: z.string().default(""),
  valorBruto: z.coerce.number().min(0),
  irRetPct: z.coerce.number().min(0).max(100).nullable().optional(),
  issRetPct: z.coerce.number().min(0).max(100).nullable().optional(),
  incluido: z.boolean().default(true),
  origem: z.enum(["NOVO", "PENDENTE_ANTERIOR"]).default("NOVO"),
  cancelada: z.boolean().default(false),
  descricao: z.string().optional(),
  tipoTomador: z.enum(["PF", "PJ"]).nullable().optional(),
});

export const notasFiscaisBatchSchema = z.object({
  notas: z.array(notaFiscalDraftSchema).min(1),
});

export const notaFiscalPatchSchema = z.object({
  tomador: z.string().optional(),
  prestador: z.string().optional(),
  numero: z.string().optional(),
  data: z.string().optional(),
  valorBruto: z.coerce.number().min(0).optional(),
  irRetPct: z.coerce.number().min(0).max(100).nullable().optional(),
  issRetPct: z.coerce.number().min(0).max(100).nullable().optional(),
  incluido: z.boolean().optional(),
  socioId: z.string().nullable().optional(),
});
