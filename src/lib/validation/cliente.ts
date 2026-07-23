import { z } from "zod";

export const custoFixoInputSchema = z.object({
  desc: z.string().trim().min(1, "Descrição é obrigatória"),
  valor: z.coerce.number().min(0, "Valor não pode ser negativo"),
});

export const clienteInputSchema = z
  .object({
    empresa: z.string().trim().min(1, "Nome da empresa é obrigatório"),
    profissional: z.string().trim().default(""),
    regime: z.enum(["PRESUMIDO", "SIMPLES"]),
    aliquotaSimplesMensal: z.coerce.number().min(0).max(100).nullable().optional(),
    custosFixos: z.array(custoFixoInputSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.regime === "SIMPLES" && (!data.aliquotaSimplesMensal || data.aliquotaSimplesMensal <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aliquotaSimplesMensal"],
        message: "Informe a alíquota mensal do Simples",
      });
    }
  });

export type ClienteInput = z.infer<typeof clienteInputSchema>;
