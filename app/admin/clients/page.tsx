"use client"

import { CreateClientDialog } from "@/components/create-client-dialog"
import { RCSClientsTable } from "@/components/rcs-client-table"
import { ClientsTable } from "@/components/clients-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState, useMemo } from "react"
import type { Client } from "@/types"

import { resolveHeartbeatStatus } from "@/lib/heartbeat"


export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [liveClients, setLiveClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("admin")
  

  /*** ================= NEW STATES FOR DISTRICT-DRILLDOWN ================= ***/
  const [districtStats, setDistrictStats] = useState<Record<string, number>>({})
  const [selectedCategory, setSelectedCategory] = useState<"all" | "online" | "offline" | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)

  /* ================= FETCH CLIENTS ================= */

  

  const fetchClients = async () => {
  try {
    setLoading(true)

    const res = await fetch("/api/clients")

    const data = await res.json()

    if (!res.ok) {
      console.error(data.error)
      setClients([])
      return
    }
   const normalized = data.map((c: any, index: number) => ({
  ...c, // ✅ KEEP EVERYTHING
  id: c.id || c.client_id || `temp-${index}`, // ✅ ONLY FIX ID
}))
    setClients(normalized)
  } catch (err) {
    console.error(err)
    setClients([])
  } finally {
    setLoading(false)
  }
}
  useEffect(() => {
    fetchClients()
  }, [])

  /* ================= SYNC TO LIVE CLIENTS ================= */

  useEffect(() => {
    
    setLiveClients(clients)
  }, [clients])

  /* ================= HEARTBEAT SUBSCRIBE ================= */

//   useEffect(() => {

//   const interval = setInterval(() => {
//     fetchClients()
//   }, 10000)

//   return () => clearInterval(interval)

// }, [])

  /* ================= STATS ================= */

  const stats = useMemo(() => {
    const total = liveClients.length
    const online = liveClients.filter(
      (c) => resolveHeartbeatStatus(c.lastSeen) === "online"
    ).length
    const offline = total - online
    return { total, online, offline }
  }, [liveClients])

  /* ================= DISTRICT-WISE STATS ================= */

  useEffect(() => {
    if (!selectedCategory) return

    let relevantClients = liveClients

    if (selectedCategory === "online") {
      relevantClients = liveClients.filter(
        (c) => resolveHeartbeatStatus(c.lastSeen) === "online"
      )
    } else if (selectedCategory === "offline") {
      relevantClients = liveClients.filter(
        (c) => resolveHeartbeatStatus(c.lastSeen) === "offline"
      )
    }

    const stats: Record<string, number> = {}
    relevantClients.forEach((client) => {
      const district = client.district ?? "Unknown"
      stats[district] = (stats[district] || 0) + 1
    })

    setDistrictStats(stats)
  }, [selectedCategory, liveClients])

  /* ================= FILTER CLIENTS FOR TABLE ================= */

  const tableClients = useMemo(() => {
    let filtered = liveClients

    if (selectedCategory === "online") {
      filtered = filtered.filter(
        (c) => resolveHeartbeatStatus(c.lastSeen) === "online"
      )
    } else if (selectedCategory === "offline") {
      filtered = filtered.filter(
        (c) => resolveHeartbeatStatus(c.lastSeen) === "offline"
      )
    }

    if (selectedDistrict) {
      filtered = filtered.filter((c) => c.district === selectedDistrict)
    }

    return filtered
  }, [liveClients, selectedCategory, selectedDistrict])

  /* ================= UI ================= */

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            {userRole === "engineer"
              ? "Manage your assigned client accounts"
              : "Manage client accounts and their configurations"}
          </p>
        </div>

        {userRole === "admin" && <CreateClientDialog onSuccess={fetchClients} />}
      </div>
     

      {loading ? (
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            Loading clients...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ================= STAT CARDS ================= */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Card
              onClick={() => { setSelectedCategory("all"); setSelectedDistrict(null); }}
              className="cursor-pointer"
            >
              <CardHeader>
                <CardTitle>Total Clients</CardTitle>
              </CardHeader>
              <CardContent>{stats.total}</CardContent>
            </Card>

            <Card
              onClick={() => { setSelectedCategory("online"); setSelectedDistrict(null); }}
              className="cursor-pointer"
            >
              <CardHeader>
                <CardTitle>Online Clients</CardTitle>
              </CardHeader>
              <CardContent>{stats.online}</CardContent>
            </Card>

            <Card
              onClick={() => { setSelectedCategory("offline"); setSelectedDistrict(null); }}
              className="cursor-pointer"
            >
              <CardHeader>
                <CardTitle>Offline Clients</CardTitle>
              </CardHeader>
              <CardContent>{stats.offline}</CardContent>
            </Card>
          </div>

          {/* ================= DISTRICT CARDS ================= */}
          {selectedCategory && !selectedDistrict && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mt-6">
              {Object.entries(districtStats).map(([district, count]) => (
                <Card
                  key={district}
                  className="cursor-pointer"
                  onClick={() => setSelectedDistrict(district)}
                >
                  <CardHeader>
                    <CardTitle>{district}</CardTitle>
                  </CardHeader>
                  <CardContent>{count}</CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ================= BACK BUTTON ================= */}
          {selectedDistrict && (
            <button
              onClick={() => setSelectedDistrict(null)}
              className="text-blue-600 underline mb-4"
            >
              Back to districts
            </button>
          )}

          {/* ================= TABLE ================= */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDistrict
                  ? `Clients in ${selectedDistrict}`
                  : selectedCategory === "all"
                  ? "All Clients"
                  : selectedCategory === "online"
                  ? "Online Clients"
                  : "Offline Clients"}
              </CardTitle>
              <CardDescription>
                Showing {tableClients.length} of {liveClients.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCategory === "online" && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/clients/execute-online-status")
                        const data = await res.json()
                       alert(`Processed ${data.processedClients} clients`)
                        fetchClients() // refresh clients and table
                      } catch (err) {
                        console.error(err)
                        alert("Error executing online status")
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
                  >
                    Check Online Clients Status
                  </button>
                )}
              <ClientsTable clients={tableClients} onUpdate={fetchClients} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}