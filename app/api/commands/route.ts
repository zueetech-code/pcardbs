// app/api/commands/route.ts
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { clientId, queryId, variables, sql, isCustom } = body

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID required" },
        { status: 400 }
      )
    }

    if (!isCustom && !queryId) {
      return NextResponse.json(
        { error: "Query ID required for predefined queries" },
        { status: 400 }
      )
    }

    if (isCustom && !sql) {
      return NextResponse.json(
        { error: "SQL required for custom queries" },
        { status: 400 }
      )
    }

    /* ================= GET AGENT ================= */
    const clientRes = await pool.query(
      `SELECT agent_uid FROM clients WHERE client_id=$1`,
      [clientId]
    )

    if (clientRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      )
    }

    const agentUid = clientRes.rows[0].agent_uid

    if (!agentUid) {
      return NextResponse.json(
        { error: "No agent assigned to this client" },
        { status: 400 }
      )
    }

    /* ================= INSERT COMMAND ================= */
    let insertQuery = ""
    let params: any[] = []

    if (isCustom) {
      insertQuery = `
        INSERT INTO commands
        (client_id, agent_uid, sql, status, created_at)
        VALUES ($1,$2,$3,'pending',NOW())
        RETURNING id
      `
      params = [clientId, agentUid, sql]
    } else {
      insertQuery = `
        INSERT INTO commands
        (client_id, agent_uid, query_id, variables, status, created_at)
        VALUES ($1,$2,$3,$4,'pending',NOW())
        RETURNING id
      `
      params = [clientId, agentUid, queryId, JSON.stringify(variables || {})]
    }

    const result = await pool.query(insertQuery, params)

    /* ================= NOTIFY AGENT ================= */
    const payload = JSON.stringify({
      command_id: result.rows[0].id,
      client_id: clientId,
    })

    // escape single quotes
    const safePayload = payload.replace(/'/g, "''")
    await pool.query(`NOTIFY new_command, '${safePayload}'`)

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
    })

  } catch (err: any) {
    console.error("COMMAND ERROR:", err)
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT *
      FROM commands
      ORDER BY created_at DESC
      LIMIT 100
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching commands:", error)

    return NextResponse.json(
      { error: "Failed to fetch commands" },
      { status: 500 }
    )
  }
}