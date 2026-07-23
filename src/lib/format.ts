export function brl(v: number | null | undefined): string {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pct(v: number | null | undefined): string {
  return ((v ?? 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
}
