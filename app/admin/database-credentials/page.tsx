"use client"

import { useState, useEffect } from "react"
import { CreateDbConfigDialog } from "@/components/create-db-config-dialog"
import { DbConfigsTable } from "@/components/db-configs-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase-client"
import { collection, getDocs } from "firebase/firestore"
import type { Client, DatabaseConfig } from "@/types"

export default function DatabaseCredentialsPage() {
  const [configs, setConfigs] = useState<DatabaseConfig[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
  try {
    setLoading(true)
    setError(null)

    // fetch configs
    const configRes = await fetch("/api/db-configs")
    const configData = await configRes.json()

    if (!configRes.ok) throw new Error(configData.error)

    // fetch clients
    const clientRes = await fetch("/api/clients")
    const clientData = await clientRes.json()

    if (!clientRes.ok) throw new Error(clientData.error)

    setConfigs(configData)
    setClients(clientData)

  } catch (error: any) {
    console.error("Error fetching data:", error)
    setError(error.message || "Failed to fetch data")
  } finally {
    setLoading(false)
  }
}

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  if (error?.includes("Missing or insufficient permissions")) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <p className="font-semibold">Firestore Security Rules Not Deployed</p>
            <div className="text-sm space-y-2">
              <p>Deploy the security rules to fix this issue:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to Firebase Console → Firestore Database → Rules</li>
                <li>
                  Copy the content from <code className="bg-muted px-1 py-0.5 rounded">firestore.rules</code>
                </li>
                <li>Paste it into the rules editor</li>
                <li>Click "Publish"</li>
              </ol>
              <Button onClick={fetchData} className="mt-4">
                Retry After Deploying Rules
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  const configuredClientIds = new Set<string>(
  configs.map((config) => config.clientId)
)

const unconfiguredClients = clients.filter(
  (client) => !configuredClientIds.has(client.id)
)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Credentials</h1>
          <p className="text-muted-foreground">Securely manage database access for clients</p>
        </div>
        <CreateDbConfigDialog clients={unconfiguredClients} onSuccess={fetchData} />
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          All database credentials are encrypted using AES-256-CBC before being stored. Credentials are never displayed
          in plain text after creation.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Database Configurations</CardTitle>
          <CardDescription>Encrypted credentials for client database access</CardDescription>
        </CardHeader>
        <CardContent>
          <DbConfigsTable configs={configs} clients={clients} onDelete={fetchData} />
        </CardContent>
      </Card>
    </div>
  )
}
