"use client";

import { useState } from "react";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  createdAt: string;
}

export function UsuariosManager({ initialUsers, currentUserId }: { initialUsers: UserItem[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
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
              <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}>
                <option value="STAFF">Equipe</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role === "ADMIN" ? "Administrador" : "Equipe"}</td>
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
