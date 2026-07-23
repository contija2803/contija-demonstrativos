import { z } from "zod";

export const salvarHistoricoSchema = z.object({
  clienteId: z.string().min(1),
  notaIds: z.array(z.string().min(1)).min(1),
  custosUsados: z
    .array(
      z.object({
        desc: z.string().default(""),
        valor: z.coerce.number().min(0),
      })
    )
    .default([]),
});
