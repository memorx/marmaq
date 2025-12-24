"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OfflineBanner, InstallAppButton } from "@/components/pwa";

interface DashboardShellProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardShell({ user, title, subtitle, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="lg:ml-[240px] min-h-screen flex flex-col">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          rightContent={<InstallAppButton />}
        />
        <main className="flex-1 p-4 lg:p-6 pb-20">
          {children}
        </main>
      </div>

      {/* PWA Components */}
      <OfflineBanner />
      <InstallAppButton />
    </div>
  );
}
