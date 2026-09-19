"use client"

import type React from "react"
import { Mail, Lock, Loader2 } from "lucide-react";

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")
  setLoading(true)

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

const data = await res.json()
console.log("Login response:", data)

if (!res.ok) {
  setError(data.error)
  return
}

if (data.role === "ercs") {
  router.replace("/admin/ercs/dashboard")
  router.refresh()
} else {
  router.replace("/admin/dashboard")
  router.refresh()
}


  } catch (err) {
    setError("Login failed")
    setLoading(false)
  }
}

 return (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-6">
    <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0">
      <CardHeader className="space-y-3 text-center">
        {/* Optional logo */}
        
        <CardTitle className="text-3xl font-extrabold text-gray-900">
          Login
        </CardTitle>
        <CardDescription className="text-gray-600">
          Enter your credentials to access the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email field with icon */}
          <div className="space-y-1">
            <Label htmlFor="email" className="font-medium text-gray-700">
              Agent ID
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Password field with icon */}
          <div className="space-y-1">
            <Label htmlFor="password" className="font-medium text-gray-700">
              Agent Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Error message with animation */}
          {error && (
            <Alert
              variant="destructive"
              className="animate-in slide-in-from-top-1 fade-in duration-300"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit button with spinner */}
          <Button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>

      {/* Footer with subtle separator */}
      <div className="text-center py-4 text-sm text-gray-500 border-t">
        © {new Date().getFullYear()} ZueTech
      </div>
    </Card>
  </div>
);

}
