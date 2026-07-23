import { z } from "zod";

export const custoFixoInputSchema = z.object({
  desc: z.string().trim().min(1, "Descrição é obrigatória"),
  valor: z.coerce.number().min(0, "Valor não pode ser negativo"),
});

export const socioInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  nome: z.string().trim().min(1, "Nome do sócio é obrigatório"),
});

export const clienteInputSchema = z
  .object({
    empresa: z.string().trim().min(1, "Nome da empresa é obrigatório"),
    regime: z.enum(["PRESUMIDO", "SIMPLES"]),
    aliquotaSimplesMensal: z.coerce.number().min(0).max(100).nullable().optional(),
    custosFixos: z.array(custoFixoInputSchema).default([]),
    socios: z.array(socioInputSchema).min(1, "Cadastre ao menos um sócio"),
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
