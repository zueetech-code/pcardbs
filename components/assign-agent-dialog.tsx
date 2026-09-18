"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useToast } from "@/hooks/use-toast"
import type { Client, Agent } from "@/types"

interface AssignAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client
  onSuccess: () => void
}

export function AssignAgentDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: AssignAgentDialogProps) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentUid, setSelectedAgentUid] = useState<string>(
    client.agentUid || ""
  )

  useEffect(() => {
    if (open) fetchAgents()
      setSelectedAgentUid(client.agentUid || "")
  }, [open])


  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents")
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setAgents(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      })
    }
  }

  const handleAssign = async () => {
    if (!selectedAgentUid) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch(
        `/api/clients/${client.id}/assign-agent`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentUid: selectedAgentUid,
          }),
        }
      )

      if (!res.ok) throw new Error("Failed to assign agent")

      toast({
        title: "Agent assigned",
        description: `Agent assigned to ${client.name}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    setLoading(true)

    try {
      const res = await fetch(
        `/api/clients/${client.id}/unassign-agent`,
        {
          method: "PATCH",
        }
      )

      if (!res.ok) throw new Error("Failed to unassign agent")

      toast({
        title: "Agent unassigned",
        description: `Agent removed from ${client.name}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Agent</DialogTitle>
          <DialogDescription>
            Assign an agent to {client.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Agent</Label>

            <Select
              value={selectedAgentUid}
              onValueChange={setSelectedAgentUid}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>

              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.uid} value={agent.uid}>
                    {agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {agents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No agents available.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {client.agentUid && (
            <Button
              variant="outline"
              onClick={handleUnassign}
              disabled={loading}
            >
              Unassign Current
            </Button>
          )}

          <Button
            onClick={handleAssign}
            disabled={loading || !selectedAgentUid}
          >
            {loading ? "Assigning..." : "Assign Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}