"use client"

import { EngineersTable } from "@/components/engineers-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import type { Engineer, Client } from "@/types"
import { db } from "@/lib/firebase-client"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function EngineersPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
  try {
    setLoading(true)
    setError(null)

    // get clients
    const clientsRes = await fetch("/api/clients")
    const clientsData = await clientsRes.json()

    if (!clientsRes.ok) throw new Error(clientsData.error)

    setClients(clientsData)

    // get engineers
    const engineersRes = await fetch("/api/engineers")
    const engineersData = await engineersRes.json()

    if (!engineersRes.ok) throw new Error(engineersData.error)

    setEngineers(engineersData)

  } catch (error: any) {
    console.error("Failed to fetch data:", error)
    setError(error.message || "Failed to fetch data")
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Engineers</h1>
          <p className="text-muted-foreground">Manage engineer accounts and assign client access</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Engineers</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Engineer Account Management</AlertTitle>
        <AlertDescription>
          Engineer accounts must be created manually in Firebase Console. Once created, use this page to assign clients
          to engineers.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>All Engineers</CardTitle>
          <CardDescription>View and manage engineer accounts and their assigned clients</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[400px] items-center justify-center">
              <p className="text-muted-foreground">Loading engineers...</p>
            </div>
          ) : error ? (
            <div className="flex h-[400px] items-center justify-center">
              <p className="text-muted-foreground">Fix the error above to view engineers</p>
            </div>
          ) : (
            <EngineersTable engineers={engineers} clients={clients} onUpdate={fetchData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
