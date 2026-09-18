import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  const result = await pool.query(`
    SELECT
      client_id,
      last_closing_date,
      last_closing_balance
    FROM cash_balance
  `)

  const map: any = {}

  result.rows.forEach((row) => {
    map[row.client_id] = {
      lastClosingDate: row.last_closing_date,
      lastClosingBalance: row.last_closing_balance
    }
  })

  return NextResponse.json(map)
}