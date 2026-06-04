"use client"

import { Bell, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "next/navigation"
import { logout } from "@/lib/api-client"

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === "/login") return null

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  // Format page title from pathname
  const getPageTitle = () => {
    const routes = {
      "/": "Dashboard",
      "/inventory": "Inventory",
      "/bookings": "Bookings",
      "/delivery": "Deliveries",
      "/returns": "Returns",
      "/reports": "Reports",
      "/barcode": "Barcodes",
      "/issue-items": "Issue Items",
      "/customers": "Customers",
      "/accounting": "Accounting",
    }
    return routes[pathname as keyof typeof routes] || "Page"
  }

  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              <span>Admin User</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
