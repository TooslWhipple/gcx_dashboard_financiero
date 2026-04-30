// app/(dashboard)/layout.tsx
// Layout del area protegida: monta el AppShell (sidebar + header).
// Todas las paginas del dashboard viven bajo este grupo.

import { AppShell } from "@/components/layout/app-shell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
