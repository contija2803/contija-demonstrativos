"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ role }: { role: "ADMIN" | "STAFF" | "CLIENTE" }) {
  const pathname = usePathname();

  const tabs =
    role === "CLIENTE"
      ? [{ href: "/historico", label: "Meu Histórico" }]
      : [
          { href: "/gerar", label: "Gerar Demonstrativo" },
          { href: "/clientes", label: "Clientes" },
          { href: "/historico", label: "Histórico" },
          ...(role === "ADMIN" ? [{ href: "/usuarios", label: "Usuários" }] : []),
        ];

  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={pathname.startsWith(tab.href) ? "active" : ""}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
