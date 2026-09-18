"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User } from "lucide-react"
import { auth } from "@/lib/firebase-client"
import { useEffect, useState } from "react"

interface AdminHeaderProps {
  userEmail: string
}

export function AdminHeader({ userEmail }: AdminHeaderProps) {
  const [userRole, setUserRole] = useState<string>("Admin")

  useEffect(() => {
    const getCurrentRole = async () => {
      const user = auth.currentUser
      if (user) {
        const idTokenResult = await user.getIdTokenResult()
        const role = idTokenResult.claims.role as string
        setUserRole(role === "engineer" ? "Engineer" : "Admin")
      }
    }
    getCurrentRole()
  }, [])

  const handleLogout = async () => {
    try {
      await auth.signOut()
      document.cookie = "auth-token=; path=/; max-age=0"
      window.location.href = "/login"
    } catch (error) {
      console.error("[v0] Logout error:", error)
    }
  }

  const initials = userEmail
    .split("@")[0]
    .split(".")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b border-white/20 bg-white/85 backdrop-blur-lg">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-secondary transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1.5">
                <p className="text-sm font-semibold leading-none capitalize">{userRole}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
