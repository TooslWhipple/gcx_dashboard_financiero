'use client'

import { Suspense } from 'react'
import { cn } from '@/lib/utils'
import { SidebarProvider, useSidebar } from './sidebar-context'
import { Sidebar } from './sidebar'
import { Header } from './header'

function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'hidden md:flex flex-col fixed inset-y-0 z-50 bg-card border-r transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <Suspense fallback={<div>Loading...</div>}>
          <Sidebar />
        </Suspense>
      </aside>
      <div
        className={cn(
          'flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out',
          collapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <Suspense fallback={<div>Loading...</div>}>
          <Header />
        </Suspense>
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  )
}
