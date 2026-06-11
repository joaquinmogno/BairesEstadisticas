"use client";

import { type ReactNode } from "react";
import { AdminProvider } from "./_lib/admin-store";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc_0%,#eef2f7_42%,#e8edf4_100%)]">
        {children}
      </div>
    </AdminProvider>
  );
}
