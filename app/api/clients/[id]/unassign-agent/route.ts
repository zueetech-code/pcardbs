import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const result = await pool.query(
    `UPDATE clients SET agent_uid = NULL WHERE client_id = $1`,
    [id]
  )

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}