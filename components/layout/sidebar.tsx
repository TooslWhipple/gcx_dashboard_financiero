"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, Menu, TrendingUp, PieChart, DollarSign, Building2, Shield, FileText, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useSidebar } from "./sidebar-context"

const navigation = [
  {
    name: "Análisis Estratégico IA",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Cobranza",
    href: "/cobranza",
    icon: TrendingUp,
  },
  {
    name: "Cartera",
    href: "/cartera",
    icon: PieChart,
  },
  {
    name: "Financiamiento",
    href: "/financiamiento",
    icon: DollarSign,
  },
  {
    name: "Oficinas",
    href: "/oficinas",
    icon: Building2,
  },
  {
    name: "Garantías",
    href: "/garantias",
    icon: Shield,
  },
  {
    name: "Facturación",
    href: "/facturacion",
    icon: FileText,
  },
]


interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <div className={cn("pb-12 min-h-screen flex flex-col", className)}>
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          {/* Logo */}
          <div className={cn("flex items-center mb-6", collapsed ? "justify-center" : "justify-center")}>
            {collapsed ? (
              <span className="text-lg font-bold text-primary">G</span>
            ) : (
              <img src="/placeholder-logo.png" alt="GCX Logo" className="h-12 w-auto" />
            )}
          </div>

          {/* Toggle button */}
          <div className={cn("mb-2", collapsed ? "flex justify-center" : "flex justify-end px-2")}>
            <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full",
                  collapsed ? "justify-center px-0" : "justify-start",
                  pathname === item.href && "bg-secondary text-secondary-foreground",
                )}
                title={item.name}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-4 w-4", collapsed ? "" : "mr-2")} />
                  {!collapsed && item.name}
                </Link>
              </Button>
            ))}

          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden bg-transparent">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <ScrollArea className="flex-1">
          <Sidebar />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
