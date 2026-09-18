import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { pool } from "@/lib/db"

export async function GET() {
  try {

    /* ========= AUTH ========= */

    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    )

    const engineerId = decoded.id

    /* ========= GET ENGINEER CLIENTS ========= */

    const engineer = await pool.query(
      `SELECT assigned_clients
       FROM users
       WHERE id=$1`,
      [engineerId]
    )

    const assignedClients =
      engineer.rows[0]?.assigned_clients || []

    if (assignedClients.length === 0) {
      return NextResponse.json({
        clients: [],
        agents: []
      })
    }

    /* ========= GET CLIENT DETAILS ========= */

    const clients = await pool.query(
      `SELECT client_id AS id, name, district, status
       FROM clients
       WHERE client_id = ANY($1)`,
      [assignedClients]
    )

    /* ========= GET AGENTS ========= */

    const agents = await pool.query(
      `SELECT id AS uid, email, role, client_id AS "clientId", created_at AS "createdAt"
       FROM users
       WHERE role='agent'
       AND client_id = ANY($1)`,
      [assignedClients]
    )

    return NextResponse.json({
      clients: clients.rows,
      agents: agents.rows
    })

  } catch (err) {

    console.error("Engineer agents API error:", err)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}