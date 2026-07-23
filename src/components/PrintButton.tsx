"use client";

export function PrintButton() {
  return (
    <button className="btn ghost" onClick={() => window.print()}>
      Imprimir / Salvar PDF
    </button>
  );
}
