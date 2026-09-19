import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  const result = await pool.query(`
    SELECT
      db_configs.client_id AS "clientId",
	  c.name as clientname,
      host,
      port,
      database,
      updated_at AS "updatedAt"
    FROM db_configs
	join clients c on c.client_id=db_configs.client_id
    ORDER BY updated_at DESC
  `)

  return NextResponse.json(result.rows)
}