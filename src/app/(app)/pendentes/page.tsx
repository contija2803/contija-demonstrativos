import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/format";

export default async function PendentesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "CLIENTE") redirect("/historico");

  const clientes = await prisma.cliente.findMany({
    where: { notasFiscais: { some: { status: "PENDENTE" } } },
    include: {
      notasFiscais: {
        where: { status: "PENDENTE" },
        include: { socio: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { empresa: "asc" },
  });

  return (
    <div className="card">
      <h2>Notas fiscais pendentes de demonstrativo</h2>
      <div className="hint" style={{ marginBottom: 10 }}>
        Notas já cadastradas para cada empresa que ainda não entraram em nenhum demonstrativo salvo.
      </div>

      {clientes.length === 0 ? (
        <div className="empty">Nenhuma nota pendente no momento — tudo em dia.</div>
      ) : (
        clientes.map((c) => {
          const notas = c.notasFiscais;
          const totalValor = notas.reduce((s, n) => s + Number(n.valorBruto), 0);
          const canceladas = notas.filter((n) => n.cancelada).length;

          return (
            <div key={c.id} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <h3 style={{ margin: 0 }}>
                  {c.empresa}
                  <span className={`tag ${c.regime === "SIMPLES" ? "simples" : "presumido"}`}>
                    {c.regime === "SIMPLES" ? "Simples Nacional" : "Lucro Presumido"}
                  </span>
                </h3>
                <Link href={`/gerar/${c.id}`} className="btn orange small">
                  Gerar demonstrativo
                </Link>
              </div>
              <div className="hint" style={{ marginBottom: 8 }}>
                {notas.length} nota(s) pendente(s) · Total bruto: <b>{brl(totalValor)}</b>
                {canceladas > 0 && ` · ${canceladas} possivelmente cancelada(s)`}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Tomador</th>
                    <th>Sócio</th>
                    <th>Nº NF</th>
                    <th>Data</th>
                    <th>Valor bruto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr key={n.id}>
                      <td>{n.tomador || "—"}</td>
                      <td>{n.socio?.nome ?? "—"}</td>
                      <td>{n.numero || "—"}</td>
                      <td>{n.data || "—"}</td>
                      <td className="num">{brl(Number(n.valorBruto))}</td>
                      <td>
                        {n.cancelada && <span className="badge-warn">⚠ cancelada</span>}
                        {!n.socio && <span className="badge-warn">sem sócio</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
