import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { agentUid } = await req.json()

  const result = await pool.query(
    `UPDATE clients
     SET agent_uid = $1
     WHERE client_id = $2
     RETURNING agent_uid`,
    [agentUid, id]
  )

  return NextResponse.json({
    success: true,
    agentUid: result.rows[0].agent_uid
  })
}