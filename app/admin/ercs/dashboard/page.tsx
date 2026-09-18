"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase-client"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function ErcsDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser
      if (!user) {
        router.push("/login")
        return
      }
      const token = await user.getIdTokenResult()
      const role = token.claims.role
      if (role !== "ercs") {
        router.push("/admin/dashboard")
        return
      }
      setLoading(false)
    }
    checkRole()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-400">Verifying credentials...</p>
        </div>
      </div>
    )
  }

 return (
    <div className="h-full w-full p-6 overflow-auto">

      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold text-gray-700">
          Welcome to the ERCS Data Management Panel
        </h2>
        <p className="text-sm text-muted-foreground">
          Submit and manage ERCS records securely
        </p>
      </div>

      {/* Main Action Card */}
      <div className="flex pt-6 gap-6">
        <Card className="w-full max-w-lg bg-gradient-to-br from-green-500 to-blue-800 text-white shadow-xl">
          <CardContent className="p-8 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <FileText className="h-10 w-10 opacity-90" />
              <h3 className="text-2xl font-bold">Fill Data</h3>
            </div>

            <p className="text-white/80">
              Submit and manage ERCS related records securely and efficiently.
            </p>

            <button
              onClick={() => router.push("/admin/fill-data/ercs")}
              className="self-start rounded-full bg-white text-indigo-600 px-6 py-3 text-sm font-semibold shadow-md hover:bg-gray-100"
            >
              Open Fill Data
            </button>
          </CardContent>
        </Card>
      </div>

    </div>
  )

}