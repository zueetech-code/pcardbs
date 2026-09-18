import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  const result = await pool.query(`
    SELECT
      id AS uid,
      email,
      role,
      assigned_agents_uid AS "assignedClients"
    FROM users
    WHERE role='engineer'
  `)

  return NextResponse.json(result.rows)
}