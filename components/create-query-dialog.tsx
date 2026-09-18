"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { db } from "@/lib/firebase-client"
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where } from "firebase/firestore"
import type { Query } from "@/types"

interface CreateQueryDialogProps {
  onSuccess?: () => void
  editQuery?: Query | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface AgentOption {
  uid: string
  email: string
}

export function CreateQueryDialog({
  onSuccess,
  editQuery,
  open: controlledOpen,
  onOpenChange,
}: CreateQueryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [name, setName] = useState(editQuery?.name ?? "")
  const [sql, setSql] = useState(editQuery?.sql ?? "")
  const [variables, setVariables] = useState<string[]>(editQuery?.variables ?? [])
  const [currentVariable, setCurrentVariable] = useState("")
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>(editQuery?.assignedAgents ?? [])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && agents.length === 0) {
      loadAgents()
    }
  }, [open])

  async function loadAgents() {
  setAgentsLoading(true)

  try {
    const res = await fetch("/api/agents")
    const data = await res.json()

    setAgents(data)
  } catch (err) {
    console.error("Error loading agents:", err)
    toast({
      title: "Error",
      description: "Failed to load agents",
      variant: "destructive",
    })
  } finally {
    setAgentsLoading(false)
  }
}

  useEffect(() => {
    if (editQuery) {
      setName(editQuery.name)
      setSql(editQuery.sql)
      setVariables(editQuery.variables)
      setSelectedAgents(editQuery.assignedAgents ?? [])
    } else {
      setName("")
      setSql("")
      setVariables([])
      setSelectedAgents([])
    }
  }, [editQuery])

  const addVariable = () => {
    if (currentVariable && !variables.includes(currentVariable)) {
      setVariables([...variables, currentVariable])
      setCurrentVariable("")
    }
  }

  const removeVariable = (variable: string) => {
    setVariables(variables.filter((v) => v !== variable))
  }

  const toggleAgent = (agentUid: string) => {
    setSelectedAgents((prev) => (prev.includes(agentUid) ? prev.filter((id) => id !== agentUid) : [...prev, agentUid]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {

    if (editQuery) {

      const res = await fetch(`/api/queries/${editQuery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sql,
          variables,
          assignedAgents: selectedAgents
        })
      })

      if (!res.ok) throw new Error("Failed to update query")

      toast({
        title: "Query updated",
        description: `Query "${name}" updated`,
      })

    } else {

      const res = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sql,
          variables,
          assignedAgents: selectedAgents
        })
      })

      if (!res.ok) throw new Error("Failed to create query")

      toast({
        title: "Query created",
        description: `Query "${name}" created`,
      })
    }

    setOpen(false)
    setName("")
    setSql("")
    setVariables([])
    setSelectedAgents([])

    if (onSuccess) onSuccess()

  } catch (error) {

    toast({
      title: "Error",
      description: "Failed to save query",
      variant: "destructive",
    })

  } finally {
    setLoading(false)
  }
}
const allSelected = agents.length > 0 && selectedAgents.length === agents.length

const toggleSelectAll = () => {
  if (allSelected) {
    setSelectedAgents([])
  } else {
    setSelectedAgents(agents.map((a) => a.uid))
  }
}


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editQuery && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Query
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editQuery ? "Edit Query" : "Create New Query"}</DialogTitle>
          <DialogDescription>
            Define a predefined SQL query with optional variables. Users cannot execute arbitrary SQL.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Query Name</Label>
              <Input
                id="name"
                placeholder="e.g., Get Orders By Date Range"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sql">SQL Query</Label>
              <Textarea
                id="sql"
                placeholder="SELECT * FROM orders WHERE date BETWEEN :fromDate AND :toDate"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                required
                disabled={loading}
                rows={8}
                className="font-mono text-sm max-h-[300px] overflow-y-auto"
              />
              <p className="text-xs text-muted-foreground">
                Use :variableName syntax for parameters (e.g., :fromDate, :toDate)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., fromDate"
                  value={currentVariable}
                  onChange={(e) => setCurrentVariable(e.target.value)}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addVariable()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addVariable} disabled={loading || !currentVariable}>
                  Add
                </Button>
              </div>
              {variables.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="gap-1">
                      {variable}
                      <button
                        type="button"
                        onClick={() => removeVariable(variable)}
                        className="ml-1 rounded-sm hover:bg-secondary-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Assign to Agents</Label>
              <p className="text-xs text-muted-foreground">
                Select which agents can access this query. Leave empty to make available to all agents.
              </p>
              <div className="flex items-center gap-2 pb-2 border-b mb-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                disabled={loading || agents.length === 0}
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All Agents
              </Label>
            </div>
              <div className="border rounded p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {agentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading agents...</p>
                ) : agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agents found</p>
                ) : (
                  agents.map((agent) => (
                    <div key={agent.uid} className="flex items-center gap-2">
                      <Checkbox
                        id={agent.uid}
                        checked={selectedAgents.includes(agent.uid)}
                        onCheckedChange={() => toggleAgent(agent.uid)}
                        disabled={loading}
                      />
                      <Label htmlFor={agent.uid} className="text-sm cursor-pointer font-normal">
                        {agent.email}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editQuery ? "Updating..." : "Creating...") : editQuery ? "Update Query" : "Create Query"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
