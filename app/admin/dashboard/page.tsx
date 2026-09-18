"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { db, auth } from "@/lib/firebase-client"
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
} from "firebase/firestore"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCog, Database, Activity } from "lucide-react"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<"admin" | "engineer" | "ercs" | "agent">("admin")

  const [stats, setStats] = useState({
    clients: 0,
    agents: 0,
    configs: 0,
    queries: 0,
  })

  /* ================= PUSH MODAL STATE ================= */
  const [showPushModal, setShowPushModal] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientNames, setSelectedClientNames] = useState<string[]>([])
  const [pushDate, setPushDate] = useState("")
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<any>(null)

  /* ================= INIT ================= */
  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    loadClients()
  }, [])

  /* ================= LOAD CLIENTS ================= */
  async function loadClients() {
  try {
    const res = await fetch("/api/clients")
    const data = await res.json()

    if (!res.ok) throw new Error(data.error)

    setClients(
      data.map((c: any) => ({
        id: c.id,
        name: c.name || c.id,
      }))
    )
  } catch (err) {
    console.error("Failed to load clients:", err)
  }
}

  /* ================= LOAD DASHBOARD ================= */
  async function loadDashboard() {
  try {
    setLoading(true)

    const res = await fetch("/api/dashboard")
    const data = await res.json()

    if (!res.ok) throw new Error(data.error)

    setRole(data.role)

    setStats({
      clients: data.clients,
      agents: data.agents,
      configs: data.configs,
      queries: data.queries,
    })

  } catch (err) {
    console.error("[Dashboard] Error:", err)
  } finally {
    setLoading(false)
  }
}

  /* ================= PUSH HANDLER ================= */
 const handlePush = async () => {
  if (selectedClientNames.length === 0 || !pushDate) {
    alert("Select client and date")
    return
  }

  try {
    setPushing(true)
    setPushResult(null)

    const res = await fetch("/api/push/local", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_PUSH_API_KEY!,
      },
      body: JSON.stringify({
        clientNames: selectedClientNames,
        fromDate: pushDate,
      }),
    })

    const data = await res.json()

    /* ================= ALREADY PUSHED ================= */
    if (data?.alreadyPushed) {
      alert(
        `⚠️ Already pushed!\n\n` +
        `Client : ${data.clientName}\n` +
        `Date   : ${data.pushedDate}\n` +
        `${data.message || ""}`
      )

      // optional: still show response in UI
      setPushResult(data)
      return
    }

    /* ================= SUCCESS ================= */
    alert("✅ Data pushed successfully to RCS dashboard")

    setPushResult(data)

  } catch (err) {
    console.error(err)
    alert("❌ Push failed. Please try again.")
  } finally {
    setPushing(false)
  }
}

  /* ================= DOWNLOAD JSON ================= */
  const downloadJSON = () => {
    if (!pushResult) return

    const blob = new Blob([JSON.stringify(pushResult, null, 2)], {
      type: "application/json",
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rcs_push_${selectedClientNames.join("_")}_${pushDate}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ================= RENDER ================= */
  return (
    <>
      <div className="space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Welcome to your admin panel</p>
          </div>
          {/* {(role === "admin" || role === "engineer" || role === "ercs") && (
            <button
              onClick={() => setShowPushModal(true)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg"
            >
              Push to RCS
            </button>
          )} */}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Clients" value={stats.clients} icon={<Users className="h-5 w-5" />} loading={loading} />
          <StatCard title="Agents" value={stats.agents} icon={<UserCog className="h-5 w-5" />} loading={loading} />
          <StatCard title="Configs" value={stats.configs} icon={<Database className="h-5 w-5" />} loading={loading} />
          <StatCard title="Queries" value={stats.queries} icon={<Activity className="h-5 w-5" />} loading={loading} />
        </div>
      </div>

      {/* ================= PUSH MODAL ================= */}
      {showPushModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md h-[80vh] p-6 flex flex-col">

            {/* ===== FORM (NON-SCROLL) ===== */}
            <div className="space-y-3 shrink-0">
              <h2 className="text-xl font-bold">Push Report to RCS</h2>

              <div>
                <label className="text-sm font-medium">Client</label>
               <select
                  multiple
                  className="w-full border rounded px-3 py-2 h-40"
                  value={selectedClientNames}
                  onChange={(e) => {
                    const values = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    )
                    setSelectedClientNames(values)
                  }}
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={pushDate}
                  onChange={(e) => setPushDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded border"
                  onClick={() => setShowPushModal(false)}
                >
                  Cancel
                </button>

                <button
                  disabled={pushing || selectedClientNames.length === 0 || !pushDate}
                  onClick={handlePush}
                  className="px-4 py-2 rounded bg-green-600 text-black disabled:opacity-50"
                >
                  {pushing ? "Pushing..." : "Push"}
                </button>
              </div>
            </div>

            {/* ===== RESULTS (SCROLLABLE) ===== */}
            {pushResult && (
              <div className="mt-4 border-t pt-4 flex-1 overflow-y-auto space-y-3">
                <pre className="text-xs bg-gray-100 p-3 rounded whitespace-pre-wrap">
                  {JSON.stringify(pushResult, null, 2)}
                </pre>

                <button
                  onClick={downloadJSON}
                  className="px-3 py-2 text-sm rounded bg-blue-600 text-white"
                >
                  Download JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ================= STAT CARD ================= */
function StatCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string
  value: number
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 hover:border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-primary/80 opacity-80">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{loading ? "…" : value}</div>
        <p className="text-xs text-muted-foreground mt-1.5">Active items</p>
      </CardContent>
    </Card>
  )
}
