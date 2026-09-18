"use client"

import { CreateAgentDialog } from "@/components/create-agent-dialog"
import { AgentsTable } from "@/components/agents-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from "react"
import type { Agent, Client } from "@/types"
import { db, auth } from "@/lib/firebase-client"
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("admin")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const meRes = await fetch("/api/auth/me")
      const meData = await meRes.json()

      if (!meRes.ok) throw new Error(meData.error)

      const role = meData.role || "admin"
      setUserRole(role)

      /* ===================== ADMIN ===================== */
      if (role === "admin") {
        // Admin can query everything
        const clientsRes = await fetch("/api/clients")
        const clientsData = await clientsRes.json()
        setClients(clientsData)

        const agentsRes = await fetch("/api/agents")
        if (!agentsRes.ok) {
        throw new Error("Failed to load agents")
      }
        const agentsData = await agentsRes.json()

       
        setAgents(agentsData)
        return

      }

      /* ===================== ENGINEER ===================== */

      // 1️⃣ Read engineer's OWN user document
     const res = await fetch("/api/engineer/agents")
const data = await res.json()

      setClients(data.clients)
      setAgents(data.agents)

      

      


    } catch (error: any) {
      console.error("[v0] Failed to fetch data:", error.message)
      console.error("[v0] Error details:", error)

      setError("Failed to load agents due to permission restrictions.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            {userRole === "engineer"
              ? "Manage agents assigned to your clients"
              : "Manage agent accounts and their client assignments"}
          </p>
        </div>

        {userRole === "admin" && (
          <CreateAgentDialog clients={clients} onSuccess={fetchData} />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Permission Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {userRole === "admin" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Agent Creation</AlertTitle>
          <AlertDescription>
            Agent accounts must be created manually in Firebase Console.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {userRole === "engineer" ? "Assigned Agents" : "All Agents"}
          </CardTitle>
          <CardDescription>
            {userRole === "engineer"
              ? "Agents working under your assigned clients"
              : "All agent accounts in the system"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-[400px] items-center justify-center">
              <p className="text-muted-foreground">Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center">
              <p className="text-muted-foreground">No agents found</p>
            </div>
          ) : (
            <AgentsTable agents={agents} clients={clients} onUpdate={fetchData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
