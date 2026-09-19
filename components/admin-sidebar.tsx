"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, UserCog, Users2, Database, FileText, Play, ScrollText } from "lucide-react"
import { useEffect, useState } from "react"


const adminMenuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users2,
    roles: ["admin"],
  },
  {
    title: "Clients",
    href: "/admin/clients",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Online Clients",
    href: "/admin/online-clients",
    icon: Users2,
    roles: ["admin"],
  },
  // {
  //   title: "Agents",
  //   href: "/admin/agents",
  //   icon: UserCog,
  //   roles: ["admin"],
  // },
  {
    title: "Engineers",
    href: "/admin/engineers",
    icon: Users2,
    roles: ["admin"],
  },
  {
    title: "Database Credentials",
    href: "/admin/database-credentials",
    icon: Database,
    roles: ["admin"],
  },
  {
    title: "Queries",
    href: "/admin/queries",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Execute Query",
    href: "/admin/execute-query",
    icon: Play,
    roles: ["admin"],
  },
  {
    title: "Push Data to RCS",  // New menu item
    href: "/admin/push-data",   // New route for push data page
    icon: Play,                 // Appropriate icon
    roles: ["admin"],           // Only for admin role
  },
   {
    title: "Data",
    href: "/admin/multi-client-dashboard",
    icon: ScrollText,
    roles: ["admin"],
  },
  {
    title: "Logs",
    href: "/admin/logs",
    icon: ScrollText,
    roles: ["admin"],
  },
]

const engineerMenuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["engineer"],
  },
  {
    title: "Clients",
    href: "/admin/clients",
    icon: Users,
    roles: ["engineer"],
  },
  // {
  //   title: "Agents",
  //   href: "/admin/agents",
  //   icon: UserCog,
  //   roles: ["engineer"],
  // },
  {
    title: "Execute Query",
    href: "/admin/execute-query",
    icon: Play,
    roles: ["engineer"],
  },
  {
    title: "Logs",
    href: "/admin/logs",
    icon: ScrollText,
    roles: ["engineer"],
  },
]

const agentMenuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["agent"],
  },
  
   {
    title: "Fill Data",
    href: "/admin/fill-data",
    icon: FileText,
    roles: ["agent"],
  },
  {
    title: "Logs",
    href: "/admin/logs",
    icon: ScrollText,
    roles: ["agent"],
  },
]

const ercsMenuItems = [
  {
    title: "Dashboard",
    href: "/admin/ercs/dashboard",
    icon: LayoutDashboard,
    roles: ["ercs"],
  },
   {
    title: "Fill Data",
    href: "/admin/fill-data/ercs",
    icon: FileText,
    roles: ["ercs"],
  },
  {
    title: "Logs",
    href: "/admin/logs",
    icon: ScrollText,
    roles: ["ercs"],
  },
]



export function AdminSidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>("admin")
  const [filteredMenuItems, setFilteredMenuItems] = useState(adminMenuItems)

  useEffect(() => {

  const loadRole = async () => {

    try {

      const res = await fetch("/api/auth/me")
      const data = await res.json()

      const role = data.role || "admin"

      setUserRole(role)

      let menu = adminMenuItems

      if (role === "engineer") {
        menu = engineerMenuItems
      } 
      else if (role === "agent") {
        menu = agentMenuItems
      } 
      else if (role === "ercs") {
        menu = ercsMenuItems
      }

      setFilteredMenuItems(menu)

    } catch (err) {

      console.error("Sidebar role load failed:", err)

    }

  }

  loadRole()

}, [])

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/20 bg-white/85 backdrop-blur-lg">
      <div className="flex h-16 items-center border-b border-white/20 px-6">
        <h1 className="text-sm font-bold uppercase tracking-wide text-sidebar-primary">
          {userRole === "engineer"
            ? "Engineer"
            : userRole === "ercs"
              ? "SLDB RCS"
              : userRole === "agent"
                ? "Agent"
                : "Admin"}
        </h1>
      </div>
      <nav className="space-y-2 p-4">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[0.65rem] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/40 text-sidebar-primary shadow-md border border-white/40"
                  : "text-sidebar-foreground/70 hover:bg-white/20 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
