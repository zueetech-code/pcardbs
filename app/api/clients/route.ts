import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { randomBytes } from "crypto"

export async function GET() {
  const result = await pool.query(`
    SELECT
  c.client_id AS "client_id",
  c.name,
  c.district,
  c.status,
  c.agent_uid AS "agentUid",
  u.email AS "agentEmail",
 TO_CHAR(h.last_seen AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "lastSeen"
FROM clients c
LEFT JOIN agent_heartbeats h
  ON c.client_id = h.client_id
LEFT JOIN users u
  ON c.agent_uid = u.id::text
ORDER BY c.created_at DESC
  `)
//console.log("📊 FETCHED CLIENTS:", result.rows)
  return NextResponse.json(result.rows)
}

export async function POST(req: Request) {
  const { name, district, status } = await req.json()

  if (!name || !district) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400 }
    )
  }

  const clientId = randomBytes(10).toString("hex")

  await pool.query(
    `
    INSERT INTO clients
      (client_id, name, district, status, created_at)
    VALUES ($1,$2,$3,$4,NOW())
    `,
    [clientId, name, district, status]
  )

  return NextResponse.json({
    success: true,
    id: clientId
  })
}