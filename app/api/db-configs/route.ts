import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  const result = await pool.query(`
    SELECT
      client_id AS "clientId",
      host,
      port,
      database,
      updated_at AS "updatedAt"
    FROM db_configs
    ORDER BY updated_at DESC
  `)

  return NextResponse.json(result.rows)
}