import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  const result = await pool.query(`
    SELECT client_id, email
    FROM users
    WHERE client_id IS NOT NULL
  `)

  const map: Record<string,string> = {}

  result.rows.forEach((row)=>{
    map[row.client_id] = row.email
  })

  return NextResponse.json(map)
}