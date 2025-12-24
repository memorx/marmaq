import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { DashboardLayoutClient } from "./layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardLayoutClient
      user={{
        id: session.user.id || "",
        name: session.user.name || "Usuario",
        email: session.user.email || "",
        role: session.user.role || "TECNICO",
      }}
    >
      {children}
    </DashboardLayoutClient>
  );
}
