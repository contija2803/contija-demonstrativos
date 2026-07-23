import { z } from "zod";

export const userInputSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório"),
    email: z.string().trim().toLowerCase().email("E-mail inválido"),
    password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
    role: z.enum(["ADMIN", "STAFF", "CLIENTE"]).default("STAFF"),
    clienteId: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "CLIENTE" && !data.clienteId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clienteId"],
        message: "Selecione a empresa que este usuário poderá visualizar",
      });
    }
  });
