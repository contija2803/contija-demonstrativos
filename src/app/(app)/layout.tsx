import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Image from "next/image";
import { NavTabs } from "@/components/NavTabs";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user?.role as "ADMIN" | "STAFF" | "CLIENTE" | undefined) ?? "STAFF";

  return (
    <>
      <header className="top">
        <div className="brand">
          <Image src="/logo-contija.png" alt="Contija Contabilidade" width={110} height={0} style={{ height: "auto" }} />
          <div>
            <h1>Sistema de Demonstrativos de Pagamento</h1>
            <div className="sub">
              {session?.user?.name ? `Logado como ${session.user.name}` : "Contija Contabilidade"}
            </div>
          </div>
        </div>
        <SignOutButton />
      </header>
      <NavTabs role={role} />
      <main>{children}</main>
    </>
  );
}
