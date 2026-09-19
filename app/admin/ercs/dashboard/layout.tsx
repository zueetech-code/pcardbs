"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ErcsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Logout failed")
      }

      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div>
      <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-border bg-background flex items-center justify-between px-6">
        <h1 className="text-xl font-semibold text-black-700">
          PCARDB ERCS Dashboard
        </h1>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>

          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="w-full h-full p-6 overflow-auto pt-20">
        {children}
      </main>
    </div>
  )
}
