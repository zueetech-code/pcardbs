"use client"

import { useEffect, useMemo, useState } from "react"
import type { Client } from "@/types"
import { resolveHeartbeatStatus } from "@/lib/heartbeat"
import { RCSClientsTable } from "@/components/rcs-client-table"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function OnlineClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL")

  /* ================= FETCH CLIENTS ================= */

  const fetchClients = async () => {
    try {
      setLoading(true)

      const res = await fetch("/api/clients")
      const data = await res.json()

      const normalized = data.map((c: any, index: number) => ({
        ...c,
        id: c.id || c.client_id || `temp-${index}`,
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

  /* ================= ONLY ONLINE CLIENTS ================= */

  const onlineClients = useMemo(() => {
    return clients.filter(
      (c) => resolveHeartbeatStatus(c.lastSeen) === "online"
    )
  }, [clients])

  /* ================= DISTRICT LIST ================= */

  const districts = useMemo(() => {
    const unique = new Set<string>()
    onlineClients.forEach((c) => {
      if (c.district) unique.add(c.district)
    })
    return ["ALL", ...Array.from(unique)]
  }, [onlineClients])

  /* ================= FILTER BY DISTRICT ================= */

  const filteredClients = useMemo(() => {
    if (selectedDistrict === "ALL") return onlineClients
    return onlineClients.filter((c) => c.district === selectedDistrict)
  }, [onlineClients, selectedDistrict])

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Online Clients</h1>

      {/* ================= TOP CONTROLS ================= */}
      <div className="flex gap-4 items-center">
        
        {/* DISTRICT FILTER */}
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* CHECK STATUS BUTTON */}
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/clients/execute-online-status")
              const data = await res.json()
             alert(`Processed ${data.processedClients} clients`)
              fetchClients()
            } catch (err) {
              console.error(err)
              alert("Error checking online status")
            }
          }}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Check Online Status
        </button>
      </div>

      {/* ================= TABLE ================= */}

      <Card>
        <CardHeader>
          <CardTitle>
            Showing {filteredClients.length} Online Clients
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <RCSClientsTable
              clients={filteredClients}
              onUpdate={fetchClients}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}