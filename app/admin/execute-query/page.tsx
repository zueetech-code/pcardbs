"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"


import type { Client, Query, Command } from "@/types"


export default function ExecuteQueryPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [queries, setQueries] = useState<Query[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedQueryId, setSelectedQueryId] = useState("")
  const [executionType, setExecutionType] =
    useState<"predefined" | "custom">("predefined")
  const [customSql, setCustomSql] = useState("")
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [command, setCommand] = useState<Command | null>(null)
  const [polling, setPolling] = useState(false)
  const [loading, setLoading] = useState(false)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [editedRows, setEditedRows] = useState<Record<number, Record<string, any>>>({})
  const [tableName, setTableName] = useState<string | null>(null)
  const [originalSQLs, setOriginalSQLs] = useState<string[]>([])
  const [selectedDistrict, setSelectedDistrict] =useState<string>("ALL")
  const [loadingClients, setLoadingClients] = useState(true)
  



  

  // 🔹 SELECT results
  const [resultRows, setResultRows] = useState<any[]>([])

  const { toast } = useToast()

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    loadInitialData()
    
  }, [])
  

  async function loadInitialData() {
  try {
    // get logged user
    const meRes = await fetch("/api/auth/me")
    const me = await meRes.json()

    if (!meRes.ok) throw new Error(me.error)

    const role = me.role || "admin"

    // fetch queries
    const queriesRes = await fetch("/api/queries")
    const queriesData = await queriesRes.json()

    if (!queriesRes.ok) throw new Error("Failed to load queries")

    setQueries(queriesData)

    // fetch clients
    let clientsRes

    if (role === "admin") {
      clientsRes = await fetch("/api/clients")
    } else {
      clientsRes = await fetch("/api/engineer/clients")
    }

    const clientsData = await clientsRes.json()

    if (!clientsRes.ok) throw new Error("Failed to load clients")

    // filter active
    setClients(
  clientsData.filter(
    (c: any) => !c.status || c.status.toLowerCase() === "active"
  )
)

  } catch (err) {
    console.error("[ExecuteQuery] init error:", err)
  }
}
const fetchClients = async () => {
  try {
    setLoadingClients(true)

    const res = await fetch("/api/clients", {
      cache: "no-store",
    })

    if (!res.ok) {
      throw new Error("Failed to load clients")
    }

    const data = await res.json()

    console.log("Loaded clients:", data)

    const normalizedClients: Client[] = Array.isArray(data)
      ? data.map((c: any, index: number) => ({
          ...c,
          id:
            c.id ||
            c.client_id ||
            `temp-${index}`,
        }))
      : []

    setClients(normalizedClients)

  } catch (error) {
    console.error(
      "Error loading clients:",
      error
    )

    setClients([])

  } finally {
    setLoadingClients(false)
  }
}

const districts = useMemo(() => {
  const unique = new Set<string>()

  clients.forEach((client: any) => {
    if (
      client.district &&
      String(client.district).trim()
    ) {
      unique.add(
        String(client.district).trim()
      )
    }
  })

  return [
    "ALL",
    ...Array.from(unique).sort(),
  ]
}, [clients])

const filteredClients = useMemo(() => {

  if (selectedDistrict === "ALL") {
    return clients
  }

  return clients.filter(
    (client: any) =>
      String(client.district || "").trim() ===
      selectedDistrict
  )

}, [
  clients,
  selectedDistrict,
])

  /* ================= VARIABLES ================= */
  const selectedQuery = queries.find((q) => q.id === selectedQueryId)

  useEffect(() => {
    if (!selectedQuery) return
    const vars: Record<string, string> = {}
    selectedQuery.variables.forEach((v) => (vars[v] = ""))
    setVariables(vars)
  }, [selectedQuery])

  /* ================= EXECUTE ================= */
const handleExecute = async (e: React.FormEvent) => {
  e.preventDefault();

  setLoading(true);
  setCommand(null);
  setResultRows([]);

  try {
    if (!selectedClientId) throw new Error("Client required");

    let sqlToExecute = "";
    let queryName = "";
    let qType: "predefined" | "custom" = "predefined";
    let vars: Record<string, string> = {};

    if (executionType === "predefined") {
      if (!selectedQueryId) throw new Error("Select a query");

      const selectedQuery = queries.find((q) => q.id === selectedQueryId);
      if (!selectedQuery) throw new Error("Query not found");

      sqlToExecute = selectedQuery.sql;
      queryName = selectedQuery.name;
      qType = "predefined";
      vars = variables; // send variables for predefined queries
    } else {
      if (!customSql.trim()) throw new Error("Enter custom SQL");
      sqlToExecute = customSql;
      queryName = "Custom SQL";
      qType = "custom";
      vars = {}; // no variables for custom SQL
    }

    const res = await fetch("/api/commands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: selectedClientId,
        queryId: executionType === "predefined" ? selectedQueryId : undefined,
        sql: executionType === "custom" ? sqlToExecute : undefined,
        isCustom: executionType === "custom",
        variables: vars,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Execution failed");
    }

    // Fill the Command object for front-end polling
    setCommand({
      id: data.id,
      status: "pending",
      clientId: selectedClientId,
      queryType: qType,
      sql: sqlToExecute,
      queryName,
      createdAt: new Date().toISOString(),
    } as Command);

    setPolling(true);

    toast({
      title: "Query submitted",
      description: "Execution started",
    });
  } catch (err: any) {
    toast({
      title: "Error",
      description: err.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  
  /* ================= FETCH SELECT RESULTS ================= */
async function fetchSelectResults(commandId: string) {
  const res = await fetch(
    `/api/results?commandId=${encodeURIComponent(commandId)}`,
    {
      cache: "no-store",
    }
  );

  const data = await res.json();

  console.log("RESULT API RESPONSE:", data);

  if (!res.ok) {
    throw new Error(
      data?.error || "Failed to fetch results"
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}



  /* ================= POLLING ================= */
  const commandId = command?.id || null
  useEffect(() => {
  if (!polling || !commandId) return

  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/api/commands/${commandId}`)

      if (!res.ok) return

      const updated = await res.json()
      setCommand(updated)

      if (updated.status === "success") {
  await fetchColumnOrder(commandId);

  const rows = await fetchSelectResults(commandId);

  console.log("FINAL ROWS FOR TABLE:", rows);

  setResultRows(rows);

  setOriginalSQLs(
    rows.map(
      () => updated.sql || ""
    )
  );

  setPolling(false);
}

      if (updated.status === "failed") {
        setPolling(false)
      }

    } catch (err) {
      console.error("[Polling error]", err)
    }
  }, 2000)

  return () => clearInterval(interval)

}, [polling, commandId]) // ✅ remove command dependency


 async function fetchColumnOrder(commandId: string) {
  const res = await fetch(`/api/results/meta?commandId=${commandId}`)
  const data = await res.json()

  if (Array.isArray(data.columnOrder)) {
    setColumnOrder(data.columnOrder)
  }

  if (data.tableName) {
    setTableName(data.tableName)
  }
}
  /* ================= DELETE RESULTS ================= */
 async function deleteTempQueryResult(commandId: string) {
  await fetch(`/api/results?commandId=${commandId}`, {
  method: "DELETE",
})
  setResultRows([])

  toast({
    title: "Results deleted",
    description: "Execution results removed",
  })
}

// Format cell value for display
function formatCellValue(value: any) {
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0] // ✅ keeps original date
  }
  return String(value ?? "")
}


// Build UPDATE SQL statement
// Build UPDATE SQL using existing WHERE clause from SELECT if available
function buildUpdateSQL(
  table: string,
  originalRow: Record<string, any>,
  changes: Record<string, any>,
  originalSQL?: string // optional original SELECT query
) {
  if (!changes || Object.keys(changes).length === 0) {
    throw new Error("No changes to update");
  }

  // 🔹 Build SET clause
  const setClause = Object.entries(changes)
    .map(([col, val]) => `${col} = ${toSqlValue(val)}`)
    .join(", ");

  // 🔹 Extract WHERE from original SQL if exists
  let whereClause: string | null = null;

  if (originalSQL) {
    const match = originalSQL.match(/where\s+(.+)$/i);
    if (match) {
      whereClause = match[1].trim();

      // Replace = NULL with IS NULL in original SQL WHERE clause
      whereClause = whereClause.replace(/\s*=\s*NULL/gi, " IS NULL");
    }
  }

  // 🔹 Fallback: use original row values to uniquely identify row
  if (!whereClause) {
    whereClause = Object.entries(originalRow)
      .map(([k, v]) => `${k} ${toSqlWhereValue(v)}`)
      .join(" AND ");
  }

  if (!whereClause) {
    throw new Error("No WHERE clause available for update");
  }

  return `UPDATE ${table} SET ${setClause} WHERE ${whereClause};`;
}



// Save edits to database
// ================= SAVE EDITS =================
async function saveEdits() {
  try {
    if (!tableName) {
      toast({ title: "Error", description: "Table name not available", variant: "destructive" })
      return
    }

    if (Object.keys(editedRows).length === 0) {
      toast({ title: "No changes", description: "Nothing to save" })
      return
    }

    // Build SQL for each edited row
    const sqlStatements = Object.entries(editedRows).map(
  ([rowIndex, changes]) =>
    buildUpdateSQL(
      tableName!,
      resultRows[Number(rowIndex)],
      changes,
      command?.sql // <--- use the executed query SQL here
    )
)

    // Remove extra semicolons & join into a single command
    const sqlToSend = sqlStatements.map(s => s.trim().replace(/;+$/,";")).join("\n")

    // Send custom SQL to your backend
    await fetch("/api/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClientId,
        sql: sqlToSend,
        isCustom: true,
      }),
    })

    toast({ title: "Update submitted", description: "Changes sent to database" })

    // Clear edits locally
    setEditedRows({})

    // Optionally delete temporary SELECT results
    if (command?.id) {
      await deleteTempQueryResult(command.id)
    }

  } catch (err: any) {
    console.error("Save edits error:", err)
    toast({
      title: "Update failed",
      description: err.message || "Could not submit updates",
      variant: "destructive",
    })
  }
}


// Handle cell change
function handleCellChange(
  rowIndex: number,
  column: string,
  value: string
) {
  setEditedRows((prev) => ({
    ...prev,
    [rowIndex]: {
      ...(prev[rowIndex] ?? {}),
      [column]: value,
    },
  }))
}


// Convert value to SQL-compatible format
// 🔹 Convert value to SQL-compatible format
function toSqlValue(value: any) {
  if (value === null || value === undefined || value === "") {
    return "NULL"; // SET column = NULL
  }

  if (!isNaN(Number(value))) {
    return value;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function toSqlWhereValue(value: any) {
  if (value === null || value === undefined || value === "") {
    return "IS NULL"; // WHERE column IS NULL
  }

  if (!isNaN(Number(value))) {
    return `= ${value}`;
  }

  return `= '${String(value).replace(/'/g, "''")}'`;
}
const isSelectOnlyQuery = (sql: string) => {
  const cleaned = sql
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  // Must start with SELECT
  if (!cleaned.startsWith("select ")) return false;

  // Disallowed keywords
  const forbidden = [
    "insert ",
    "update ",
    "delete ",
    "drop ",
    "alter ",
    "truncate ",
    "create ",
    "grant ",
    "revoke ",
  ];

  if (forbidden.some((kw) => cleaned.includes(kw))) return false;

  // Block multiple queries / comments
  if (
    cleaned.includes(";") ||
    cleaned.includes("--") ||
    cleaned.includes("/*")
  ) {
    return false;
  }

  return true;
};
const cols =
  columnOrder.length > 0
    ? columnOrder
    : Object.keys(resultRows[0] || {})









  /* ================= UI ================= */
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Execute Query</h1>

      <form onSubmit={handleExecute} className="grid gap-6 lg:grid-cols-2">
        {/* LEFT */}
        <Card>
          <CardHeader>
            <CardTitle>Execution</CardTitle>
            <CardDescription>Select client and query</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">

  <label className="text-sm font-medium">
    District
  </label>

  <select
    value={selectedDistrict}
    onChange={(e) => {

      setSelectedDistrict(
        e.target.value
      )

      // Reset client selection
      setSelectedClientId("")

    }}
    className="w-full border rounded-md px-3 py-2"
  >

    {districts.map((district) => (

      <option
        key={district}
        value={district}
      >
        {district}
      </option>

    ))}

  </select>

</div>
            <div className="space-y-2">

  <label className="text-sm font-medium">
    Client
  </label>

  <select
    value={selectedClientId}
    onChange={(e) => {
      setSelectedClientId(
        e.target.value
      )
    }}
    className="w-full border rounded-md px-3 py-2"
    disabled={loadingClients}
  >

    <option value="">
      {loadingClients
        ? "Loading clients..."
        : "Select Client"}
    </option>

    {filteredClients.map(
      (client: any) => {

        const clientId =
          client.client_id ||
          client.id

        return (
          <option
            key={clientId}
            value={clientId}
          >
            {client.name}
          </option>
        )
      }
    )}

  </select>

</div>

            <Tabs
              value={executionType}
              onValueChange={(v) =>
                setExecutionType(v as "predefined" | "custom")
              }
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="predefined">Predefined</TabsTrigger>
                <TabsTrigger value="custom">Custom SQL</TabsTrigger>
              </TabsList>

              <TabsContent value="predefined" className="space-y-3">
                <Select
                  value={selectedQueryId}
                  onValueChange={setSelectedQueryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select query" />
                  </SelectTrigger>
                  <SelectContent>
                    {queries.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedQuery && selectedQuery.variables.length > 0 && (
                  <div className="space-y-3 border rounded p-3">
                    {selectedQuery.variables.map((v) => (
                      <div key={v}>
                        <Label>{v}</Label>
                        <Input
                          value={variables[v]}
                          onChange={(e) =>
                            setVariables({
                              ...variables,
                              [v]: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom">
                <Textarea
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  className="min-h-[200px] font-mono"
                  required
                />
              </TabsContent>
            </Tabs>

            <Button
              type="submit"
              disabled={
                loading ||
                !selectedClientId ||
                (executionType === "predefined" && !selectedQueryId) ||
                (executionType === "custom" &&  (!customSql.trim() || !isSelectOnlyQuery(customSql)))
              }
            >
              {loading ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Play className="mr-2" />
              )}
              Execute
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {!command ? (
              <p className="text-muted-foreground">No execution yet</p>
            ) : (
              <>
                <Badge>{command.status}</Badge>

                {command.status === "failed" && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {command.error || "Execution failed"}
                    </AlertDescription>
                  </Alert>
                )}

                {resultRows.length > 0 && command && (
                <>
                  <div className="overflow-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead>
                          <tr>
                            {cols.map((col) => (
                              <th key={col} className="border px-2 py-1 text-left">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                          <tbody>
                              {resultRows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {cols.map((col) => (
                                    <td key={col} className="border px-2 py-1">
                                      <Input
                                        className="h-8"
                                        value={
                                          editedRows[rowIndex]?.[col] ??
                                          formatCellValue(row[col]) ?? ""
                                        }
                                        onChange={(e) =>
                                          handleCellChange(rowIndex, col, e.target.value)
                                        }
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>




                    </table>
                     <Button
                      type="button"
                      className="mt-3"
                      disabled={Object.keys(editedRows).length === 0}
                      onClick={saveEdits}
                    >
                      Save Changes
                    </Button>
                  </div>

                  {/* 🗑 DELETE BUTTON */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      if (command?.id) {
                        deleteTempQueryResult(command.id)
                      }
                    }}
                  >
                    Delete Execution Results
                  </Button>
                </>
              )}

              </>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
