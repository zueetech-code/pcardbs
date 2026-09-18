import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await pool.query(
      `UPDATE users SET active = NOT active WHERE id = $1`,
      [id]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}