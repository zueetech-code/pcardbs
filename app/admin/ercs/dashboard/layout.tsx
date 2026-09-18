"use client"

import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase-client"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"

export default function ErcsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleBack = () => router.back()
  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

 return (
    <div>

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-border bg-background flex items-center justify-between px-6">
        <h1 className="text-xl font-semibold normal text-black-700">
          UCCS ERCS Dashboard
        </h1>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await signOut(auth)
              router.push("/")
            }}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="w-full h-full p-6 overflow-auto">
        {children}
      </main>

    </div>
  )
}