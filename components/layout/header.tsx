"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { MobileSidebar } from "./sidebar"

export function Header() {
  const router = useRouter()
  const [username, setUsername] = useState<string>('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.username && setUsername(d.username))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4 hidden md:flex">
            <div className="mr-6 flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block text-foreground pl-4">Sistema de Cobranza</span>
            </div>
          </div>
          <MobileSidebar />
        </div>

        <div className="flex items-center gap-3 pr-2">
          {username && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{username}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
