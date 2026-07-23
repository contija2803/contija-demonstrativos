"use client";

import { useState } from "react";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CLIENTE";
  createdAt: string;
  clienteId: string | null;
  clienteEmpresa: string | null;
}

const ROLE_LABEL: Record<UserItem["role"], string> = {
  ADMIN: "Administrador",
  STAFF: "Equipe",
  CLIENTE: "Cliente",
};

export function UsuariosManager({
  initialUsers,
  currentUserId,
  clientesLista,
}: {
  initialUsers: UserItem[];
  currentUserId: string;
  clientesLista: { id: string; empresa: string }[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserItem["role"]>("STAFF");
  const [clienteId, setClienteId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (role === "CLIENTE" && !clienteId) {
      setError("Selecione a empresa que este usuário poderá visualizar.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, clienteId: role === "CLIENTE" ? clienteId : null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.formErrors?.[0] || data?.error || "Não foi possível criar o usuário.");
      }
      const user: UserItem = await res.json();
      setUsers((prev) => [...prev, user]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("STAFF");
      setClienteId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este usuário? Ele perderá o acesso ao sistema imediatamente.")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  return (
    <>
      <div className="card">
        <h2>Novo usuário</h2>
        {error && <div className="note warn">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="field">
              <label>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Senha provisória</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label>Papel</label>
              <select value={role} onChange={(e) => setRole(e.target.value as UserItem["role"])}>
                <option value="STAFF">Equipe</option>
                <option value="ADMIN">Administrador</option>
                <option value="CLIENTE">Cliente</option>
              </select>
            </div>
            {role === "CLIENTE" && (
              <div className="field">
                <label>Empresa vinculada</label>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Selecione a empresa…</option>
                  {clientesLista.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.empresa}
                    </option>
                  ))}
                </select>
                <div className="hint">Este usuário só verá o histórico desta empresa.</div>
              </div>
            )}
          </div>
          <button type="submit" className="btn orange" disabled={saving}>
            {saving ? "Criando…" : "Criar usuário"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Usuários com acesso</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Empresa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABEL[u.role]}</td>
                <td>{u.clienteEmpresa ?? "—"}</td>
                <td>
                  {u.id !== currentUserId && (
                    <button className="btn danger" onClick={() => handleDelete(u.id)}>
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
