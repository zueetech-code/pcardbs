import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET(_: Request, { params }: any) {
  const { id } = await params

  const result = await pool.query(
    `SELECT * FROM commands WHERE id=$1`,
    [id]
  )

  return NextResponse.json(result.rows[0])
}