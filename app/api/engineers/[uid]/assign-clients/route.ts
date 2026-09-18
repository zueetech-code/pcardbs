import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    const { assignedClients } = await req.json()

    await pool.query(
      `UPDATE users
       SET assigned_agents_uid = $1
       WHERE id = $2`,
      [assignedClients, uid]
    )

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}