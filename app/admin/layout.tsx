"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase-client"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)

  /* ================= AUTH CHECK ================= */
  useEffect(() => {

  const checkAuth = async () => {

    try {

      const res = await fetch("/api/auth/me")

      if (!res.ok) {
        window.location.href = "/login"
        return
      }

      const data = await res.json()

      if (!["admin", "engineer", "agent", "ercs"].includes(data.role)) {
        window.location.href = "/login"
        return
      }

      setUserRole(data.role)
      setUserEmail(data.email || "")
      setLoading(false)

    } catch (err) {

      console.error("Auth error:", err)
      window.location.href = "/login"

    }

  }

  checkAuth()

}, [])

  /* ================= LOADING OVERLAY ================= */
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
          <p className="text-neutral-300">Verifying credentials...</p>
        </div>
      </div>
    )
  }

  const hasSidebar = userRole !== "ercs"
  const hasHeader = userRole !== "ercs"

  /* ================= LAYOUT ================= */
  return (
    <div className="min-h-screen bg-background text-foreground flex">

      {/* ===== SIDEBAR ===== */}
      {hasSidebar && (
        <div className="fixed inset-y-0 left-0 w-64 z-40">
          <AdminSidebar />
        </div>
      )}

      {/* ===== MAIN AREA ===== */}
      <div
        className={`flex-1 flex flex-col ${
          hasSidebar ? "ml-64" : ""
        }`}
      >
        {/* ===== HEADER ===== */}
        {hasHeader && (
          <div className="fixed top-0 right-0 left-0 z-30">
            <AdminHeader userEmail={userEmail} />
          </div>
        )}

        {/* ===== PAGE CONTENT (SCROLLABLE) ===== */}
        <main
          className={`flex-1 overflow-y-auto ${
            hasHeader ? "mt-16" : ""
          } p-6`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
