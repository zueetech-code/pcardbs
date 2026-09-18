import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  const result = await pool.query(`
    SELECT id,name,sql,variables,assigned_agents AS "assignedAgents",created_at AS "createdAt"
    FROM queries
    ORDER BY created_at DESC
  `)

  return NextResponse.json(result.rows)
}

export async function POST(req: Request) {

  const { name, sql, variables, assignedAgents } = await req.json()

  const id = "qry_" + Date.now()

  await pool.query(`
    INSERT INTO queries
    (id,name,sql,variables,assigned_agents,created_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
  `,[id,name,sql,JSON.stringify(variables),assignedAgents])

  return NextResponse.json({ success: true })
}