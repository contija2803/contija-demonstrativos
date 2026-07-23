"use client";

import { useRouter } from "next/navigation";

interface Props {
  clientes: { id: string; empresa: string }[];
}

export function ClienteSelector({ clientes }: Props) {
  const router = useRouter();

  return (
    <div className="row">
      <div className="field" style={{ minWidth: 260 }}>
        <label>Selecionar cliente cadastrado</label>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) router.push(`/gerar/${e.target.value}`);
          }}
        >
          <option value="">Selecione um cliente…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.empresa}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
