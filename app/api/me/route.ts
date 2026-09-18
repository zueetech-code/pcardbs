import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { pool } from "@/lib/db"

export async function GET() {
  try {
    const token = (await cookies()).get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    /* ================= GET USER ================= */
    const userRes = await pool.query(
      `SELECT id, email, role, client_id FROM users WHERE id = $1`,
      [decoded.id]
    )

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userRes.rows[0]

    /* ================= GET CLIENT ================= */
    let clientName = ""

    if (user.client_id) {
      const clientRes = await pool.query(
        `SELECT name FROM clients WHERE client_id = $1`,
        [user.client_id]
      )

      if (clientRes.rows.length > 0) {
        clientName = clientRes.rows[0].name
      }
    }

    /* ================= RESPONSE ================= */
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,

      clientId: user.client_id,
      clientName: clientName,

      agentUid: user.id
    })

  } catch (err) {
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    )
  }
}