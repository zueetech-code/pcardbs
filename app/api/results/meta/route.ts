import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const commandId = searchParams.get("commandId")

const result = await pool.query(`
  SELECT column_order, table_name
  FROM query_results
  WHERE command_id = $1
  LIMIT 1
`, [commandId])

const row = result.rows[0]

return NextResponse.json({
  columnOrder: row?.column_order || [],
  tableName: row?.table_name || null
})
}