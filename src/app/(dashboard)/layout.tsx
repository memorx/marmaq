import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Sidebar } from "@/components/layout";

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
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        user={{
          name: session.user.name || "Usuario",
          email: session.user.email || "",
          role: session.user.role || "TECNICO",
        }}
      />
      <main className="ml-[240px]">
        {children}
      </main>
    </div>
  );
}
