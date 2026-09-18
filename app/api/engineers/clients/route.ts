import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

export async function GET() {
  try {
    // 🔐 Get token from cookie
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 🔓 Verify JWT
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    )

    const userId = decoded.id
    const role = decoded.role

    if (role !== "engineer") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // 🧠 Get assigned clients for engineer
    // Assuming you have a table: engineer_clients (user_id, client_id)

    const result = await pool.query(
      `
      SELECT 
        c.client_id AS "id",
        c.name,
        c.district,
        c.status,
        c.created_at
      FROM clients c
      INNER JOIN engineer_clients ec
        ON c.client_id = ec.client_id
      WHERE ec.user_id = $1
      ORDER BY c.created_at DESC
      `,
      [userId]
    )

    return NextResponse.json(result.rows)

  } catch (err) {
    console.error("ENGINEER CLIENTS ERROR:", err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}