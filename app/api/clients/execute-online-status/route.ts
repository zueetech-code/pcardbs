import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {

  try {

    const today = new Date()

    const todayStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")

    /* ================== 1️⃣ Get online clients ================== */

    const heartbeatRes = await pool.query(`
      SELECT client_id
      FROM agent_heartbeats
      WHERE status='online'
    `)

    const onlineClientIds = heartbeatRes.rows.map(r => r.client_id)

    if (onlineClientIds.length === 0) {
      return NextResponse.json({ processedClients: 0 })
    }

    /* ================== 2️⃣ Fetch client details ================== */

    const clientsRes = await pool.query(`
      SELECT 
        c.client_id,
        c.name,
        c.district,
        c.agent_uid,
        u.email
      FROM clients c
      JOIN users u 
        ON c.client_id = u.client_id::text
      WHERE c.client_id = ANY($1)
    `, [onlineClientIds])

    let processedClients = 0

    /* ================== LOOP CLIENTS ================== */

    for (const client of clientsRes.rows) {

      const clientId = client.client_id   // TEXT (correct)
      const agentUid = client.agent_uid
      const clientName = client.name

      if (!agentUid) {
        console.log("⚠️ Skipping (no agent_uid):", clientName)
        continue
      }

      /* ================== 3️⃣ Create command ================== */

      await pool.query(`
        INSERT INTO commands
        (id, client_id, agent_uid, status, query_id, variables, created_at)
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          'pending',
          'qry_1773916210321',
          $3,
          NOW()
        )
      `, [
        clientId,
        agentUid,
        JSON.stringify({ Fromdate: todayStr })
      ])

      /* ================== 4️⃣ Get latest completed result ================== */

      const commandRes = await pool.query(`
        SELECT id
        FROM commands
        WHERE client_id=$1
        AND query_id='qry_1773916210321'
        AND status='success'
        ORDER BY created_at DESC
        LIMIT 1
      `, [clientId])

      let lastClosingDate: any = null
      let lastClosingBalance: any = null

      if (commandRes.rows.length > 0) {

        const commandId = commandRes.rows[0].id

        const resultRes = await pool.query(`
          SELECT row_data
          FROM query_results
          WHERE command_id=$1
          LIMIT 1
        `, [commandId])

        if (resultRes.rows.length > 0) {

          let row = resultRes.rows[0].row_data

          /* ✅ FIX: handle double JSON */
          if (typeof row === "string") {
            row = JSON.parse(row)
          }

          console.log("📦 Parsed Row:", row)

          lastClosingDate = row?.lastdate || null
          lastClosingBalance = row?.closingbalance || null

          /* ✅ Clean balance */
          if (typeof lastClosingBalance === "string") {
            lastClosingBalance =
              parseFloat(lastClosingBalance.replace(/[^0-9.-]+/g, "")) || 0
          }
        }
      }

      /* ================== SKIP if no valid data ================== */

      if (!lastClosingDate) {
        console.log("⚠️ No closing date for:", clientName)
        continue
      }

      /* ================== 5️⃣ UPSERT cash_balance ================== */

      await pool.query(`
        INSERT INTO cash_balance
        (client_id,client_name, district, email, last_closing_balance, last_closing_date, updated_at)
        VALUES ($1, $2, $3, $4, $5,$6, NOW())
        ON CONFLICT (client_name, last_closing_date)
        DO UPDATE SET
          last_closing_balance = EXCLUDED.last_closing_balance,
          district = EXCLUDED.district,
          email = EXCLUDED.email,
          updated_at = NOW()
      `, [
        clientId,
        clientName,
        client.district,
        client.email,
        lastClosingBalance,
        lastClosingDate   // ✅ IMPORTANT
      ])

      processedClients++
    }

    return NextResponse.json({ processedClients })

  } catch (err: any) {

    console.error("🔥 [execute-online-status]", err)

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}