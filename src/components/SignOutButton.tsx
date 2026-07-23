"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="btn ghost small"
      style={{ borderColor: "#fff", color: "#fff" }}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sair
    </button>
  );
}
