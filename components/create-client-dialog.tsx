"use client"

import type React from "react"
import { useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getFirestore, collection, addDoc } from "firebase/firestore"
import { districts } from "@/lib/districts"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateClientDialogProps {
  onSuccess: () => void
}

export function CreateClientDialog({ onSuccess }: CreateClientDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"active" | "disabled">("active")
  const [loading, setLoading] = useState(false)
  const [district, setDistrict] = useState("")
  const [openDistrict, setOpenDistrict] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        district,
        status,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to create client")
    }

    toast({
      title: "Client created",
      description: `Client ${name} created successfully`,
    })

    setOpen(false)
    setName("")
    setDistrict("")
    setStatus("active")

    onSuccess()

  } catch (error: any) {

    toast({
      title: "Error",
      description: error.message || "Failed to create client",
      variant: "destructive",
    })

  }

  setLoading(false)
}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
          <DialogDescription>
            Add a new client to the system. A unique client ID will be auto-generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                placeholder="Enter client name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>District</Label>

              <Popover open={openDistrict} onOpenChange={setOpenDistrict}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {district || "Select district"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-h-60 p-0">
                  <Command>
                    <CommandInput placeholder="Search district..." />

                    <CommandEmpty>No district found.</CommandEmpty>

                    <CommandGroup className="overflow-auto max-h-60">
                      {districts.map((d) => (
                        <CommandItem
                          key={d}
                          value={d}
                          onSelect={(value) => {
                            setDistrict(value)
                            setOpenDistrict(false)
                          }}
                        >
                          {d}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: "active" | "disabled") => setStatus(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
