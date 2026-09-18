"use client"

import { useEffect, useState } from "react"
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle,
} from "@/components/ui/card"
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Client, Query as QueryType, Command } from "@/types"

export default function LogsPage() {
const [commands, setCommands] = useState<Command[]>([])
const [clients, setClients] = useState<Client[]>([])
const [queries, setQueries] = useState<QueryType[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
async function fetchData() {
try {
setLoading(true)
setError(null)

    const [
      commandsResponse,
      clientsResponse,
      queriesResponse,
    ] = await Promise.all([
      fetch("/api/commands", {
        method: "GET",
        cache: "no-store",
      }),
      fetch("/api/clients", {
        method: "GET",
        cache: "no-store",
      }),
      fetch("/api/queries", {
        method: "GET",
        cache: "no-store",
      }),
    ])

    if (!commandsResponse.ok) {
      throw new Error("Failed to fetch commands")
    }

    if (!clientsResponse.ok) {
      throw new Error("Failed to fetch clients")
    }

    if (!queriesResponse.ok) {
      throw new Error("Failed to fetch queries")
    }

    const commandsData = await commandsResponse.json()
    const clientsData = await clientsResponse.json()
    const queriesData = await queriesResponse.json()

    setCommands(
      Array.isArray(commandsData)
        ? commandsData
        : commandsData.commands || []
    )

    setClients(
      Array.isArray(clientsData)
        ? clientsData
        : clientsData.clients || []
    )

    setQueries(
      Array.isArray(queriesData)
        ? queriesData
        : queriesData.queries || []
    )
  } catch (err) {
    console.error("Error fetching logs:", err)

    setError(
      err instanceof Error
        ? err.message
        : "Failed to load logs"
    )
  } finally {
    setLoading(false)
  }
}

fetchData()


}, [])

// Get client name from client_id
const getClientName = (clientId: string | null | undefined) => {
if (!clientId) {
return "—"
}

const client = clients.find((client: any) => {
  return (
    client.id === clientId ||
    client.client_id === clientId
  )
})

return (
  client?.name ||
  client?.name ||
  clientId
)


}

// Get query name from query_id
const getQueryName = (queryId: string | null | undefined) => {
if (!queryId) {
return "Custom SQL"
}

const query = queries.find((query: any) => {
  return (
    query.id === queryId ||
    query.query_id === queryId
  )
})

return (
  query?.name ||
  query?.name ||
  queryId
)


}

// Format date/time
function formatDate(value: unknown): string {
if (!value) {
return "—"
}

const date = new Date(
  value as string | number | Date
)

if (isNaN(date.getTime())) {
  return "—"
}

const dd = String(date.getDate()).padStart(2, "0")
const mm = String(date.getMonth() + 1).padStart(2, "0")
const yyyy = date.getFullYear()

const hh = String(date.getHours()).padStart(2, "0")
const min = String(date.getMinutes()).padStart(2, "0")
const ss = String(date.getSeconds()).padStart(2, "0")

return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`


}

// Format JSON/object values
function formatValue(value: unknown): string {
if (value === null || value === undefined) {
return "—"
}

if (typeof value === "object") {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

return String(value)


}

// Status badge
function getStatusVariant(
status: string | null | undefined
) {
switch (status?.toLowerCase()) {
case "success":
case "completed":
return "default"

  case "failed":
  case "error":
    return "destructive"

  case "pending":
  case "running":
    return "secondary"

  default:
    return "outline"
}


}

// Loading state
if (loading) {
return (
<div className="flex h-96 items-center justify-center">
<div className="text-sm text-muted-foreground">
Loading logs...
</div>
</div>
)
}

// Error state
if (error) {
return (
<div className="flex h-96 items-center justify-center">
<div className="text-center">
<h3 className="text-sm font-semibold">
Failed to load logs
</h3>

      <p className="mt-1 text-sm text-muted-foreground">
        {error}
      </p>
    </div>
  </div>
)


}

return (
<div className="space-y-6">
{/* Page Header */}
<div>
<h1 className="text-3xl font-bold tracking-tight">
Logs
</h1>

    <p className="text-muted-foreground">
      View command execution history and status
    </p>
  </div>

  {/* Logs Card */}
  <Card>
    <CardHeader>
      <CardTitle>
        Command Execution History
      </CardTitle>

      <CardDescription>
        Latest 100 command executions across all clients
      </CardDescription>
    </CardHeader>

    <CardContent>
      {commands.length === 0 ? (
        /* Empty State */
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <h3 className="text-sm font-semibold">
              No logs
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Execute queries to see logs here.
            </p>
          </div>
        </div>
      ) : (
        /* Logs Table */
        <div className="w-full overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {commands.map((command: any) => (
                <TableRow key={command.id}>
                  {/* ID */}
                  <TableCell className="font-mono text-xs">
                    {command.id}
                  </TableCell>

                  {/* Client */}
                  <TableCell className="font-medium">
                    {getClientName(command.client_id)}
                  </TableCell>

                

                  {/* Query */}
                  <TableCell>
                    <div className="min-w-[160px]">
                      {command.query_id ? (
                        <>
                          <div className="font-medium">
                            {getQueryName(
                              command.query_id
                            )}
                          </div>

                          <div className="mt-1 font-mono text-xs text-muted-foreground">
                            {command.query_id}
                          </div>
                        </>
                      ) : (
                        <Badge variant="outline">
                          Custom SQL
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(
                        command.status
                      )}
                    >
                      {command.status || "unknown"}
                    </Badge>
                  </TableCell>

                  {/* Error */}
                  <TableCell>
                    {command.error ? (
                      <div className="max-w-[300px] whitespace-pre-wrap break-words rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                        {command.error}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>

                  
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
</div>


)
}