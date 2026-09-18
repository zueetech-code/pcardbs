import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  const clients = await pool.query(`SELECT COUNT(*) FROM clients`)
  const agents = await pool.query(`SELECT COUNT(*) FROM users WHERE role='agent'`)
  const configs = await pool.query(`SELECT COUNT(*) FROM db_configs`)
  const queries = await pool.query(`SELECT COUNT(*) FROM commands`)

  return NextResponse.json({
    role: "admin",
    clients: Number(clients.rows[0].count),
    agents: Number(agents.rows[0].count),
    configs: Number(configs.rows[0].count),
    queries: Number(queries.rows[0].count),
  })
}