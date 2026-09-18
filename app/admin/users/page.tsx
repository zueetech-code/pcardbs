"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"


type UserType = {
  id: string
  email: string
  role: string
  active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [open, setOpen] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("agent")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
  const res = await fetch("/api/admin/users")
  const data = await res.json()
  setUsers(data)
}

  // Create User Function
  async function handleCreate() {
  if (!confirm(`Are you sure you want to create user ${email}?`)) return

  try {
    setLoading(true)

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error)
      return
    }

    alert(`User ${email} created successfully!`)

    setEmail("")
    setPassword("")
    setRole("agent")
    setOpen(false)
    loadUsers()
  } catch (err) {
    alert("Error creating user")
  } finally {
    setLoading(false)
  }
}

  // Toggle active/inactive status
  async function toggleActive(user: UserType) {

  const action = user.active ? "deactivate" : "activate"

  if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) return

  const res = await fetch(`/api/admin/users/${user.id}/toggle`, {
    method: "PATCH"
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error)
    return
  }

  loadUsers()
}

  // Delete user
  async function deleteUser(user: UserType) {
    if (!confirm(`Are you sure you want to delete ${user.email}?`)) return

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error)
        return
      }

      alert(`User ${user.email} deleted successfully!`)
      loadUsers()
    } catch (err) {
      alert("Failed to delete user")
    }
  }

  // Update role for existing users
  async function updateUserRole(user: UserType, newRole: string) {

  if (!confirm(`Change role of ${user.email} to ${newRole}?`)) return

  const res = await fetch(`/api/admin/users/${user.id}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: newRole })
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.error)
    return
  }

  loadUsers()
}
 

 return (
  <div className="min-h-screen bg-slate-50 p-8">
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">
          User Management
        </h1>

        {/* Create User Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-lg px-6">
              + Create User
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="User Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="ercs">ERCS</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-slate-100 text-sm font-semibold text-slate-600 border-b">
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Change Role</div>
          <div>Toggle</div>
          <div>Delete</div>
        </div>

        {/* Users Rows */}
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-6 gap-4 px-6 py-4 items-center border-b last:border-0 hover:bg-slate-50 transition"
          >
            {/* Email */}
            <div className="font-medium text-slate-800 truncate">
              {user.email}
            </div>

            {/* Role */}
            <div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">
                {user.role}
              </span>
            </div>

            {/* Status */}
            <div>
              <span
                className={`px-3 py-1 rounded-full text-white text-xs font-medium ${
                  user.active ? "bg-emerald-500" : "bg-slate-400"
                }`}
              >
                {user.active ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Change Role */}
            <div className="w-36">
              <Select
                value={user.role}
                onValueChange={(newRole) =>
                  updateUserRole(user, newRole)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="ercs">ERCS</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activate / Deactivate */}
            <div>
              <Button
                size="sm"
                variant={user.active ? "destructive" : "default"}
                onClick={() => toggleActive(user)}
              >
                {user.active ? "Deactivate" : "Activate"}
              </Button>
            </div>

            {/* Delete */}
            <div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteUser(user)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}

      </div>
    </div>
  </div>
)
}
