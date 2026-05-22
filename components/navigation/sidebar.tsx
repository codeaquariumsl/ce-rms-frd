"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Truck, RotateCcw, QrCode, BarChart3, Settings, Menu, X, Users, DollarSign, Send, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { logout } from "@/lib/api-client"
import { useRouter } from "next/navigation"

const navigationItems = [
  {
    icon: BarChart3,
    title: "Dashboard",
    href: "/",
  },
  {
    icon: Package,
    title: "Inventory",
    href: "/inventory",
  },
  {
    icon: Users,
    title: "Customers",
    href: "/customers",
  },
  // {
  //   icon: QrCode,
  //   title: "Bookings",
  //   href: "/bookings",
  // },
  {
    icon: Send,
    title: "Issue Items",
    href: "/issue-items",
  },
  // {
  //   icon: Truck,
  //   title: "Deliveries",
  //   href: "/delivery",
  // },
  {
    icon: RotateCcw,
    title: "Returns",
    href: "/returns",
  },
  {
    icon: BarChart3,
    title: "Reports",
    href: "/reports",
  },
  {
    icon: Settings,
    title: "Barcodes",
    href: "/barcode",
  },
  {
    icon: DollarSign,
    title: "Accounting",
    href: "/accounting",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  if (pathname === "/login") return null

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-40">
        <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-background">
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } md:relative md:translate-x-0 z-30`}
      >
        <div className="p-6">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-primary">Chamith Enterprises</h1>
            <p className="text-xs text-muted-foreground">Rental Management System</p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start gap-3 mb-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 mb-4"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold mb-1">System v1.0.6</p>
            <p>Powered by Code Aqua</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 md:hidden z-20" onClick={() => setIsOpen(false)} />}
    </>
  )
}
