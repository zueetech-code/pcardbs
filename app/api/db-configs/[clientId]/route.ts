import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function DELETE(
  req: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = await params
    await pool.query(
      `DELETE FROM db_configs WHERE client_id = $1`,
      [clientId]
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Delete db config error:", err)

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}