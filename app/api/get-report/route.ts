import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(req: Request) {
  const client = await pool.connect()

  try {
    const body = await req.json()
    const { clientName, fromDate, exact, latest } = body

    if (!clientName) {
      return NextResponse.json(
        { error: "Missing clientName" },
        { status: 400 }
      )
    }

    /* =====================================================
       STEP 1: FIND SDS + DATE
       exact  → same date
       latest → most recent date
    ===================================================== */

    let sds = ""
    let date = ""

    if (exact && fromDate) {
      const logRes = await client.query(
        `
        SELECT sds_code, report_date
        FROM report_insert_log
        WHERE client_name = $1
          AND report_date = $2
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [clientName, fromDate]
      )

      if (!logRes.rowCount) {
        return NextResponse.json({}, { status: 404 })
      }

      sds = logRes.rows[0].sds_code
      date = logRes.rows[0].report_date
    }

    else if (latest) {
      const logRes = await client.query(
        `
        SELECT sds_code, report_date::text AS report_date
        FROM report_insert_log
        WHERE client_name = $1
        ORDER BY report_date DESC, created_at DESC
        LIMIT 1
        `,
        [clientName]
      )

      if (!logRes.rowCount) {
        return NextResponse.json({}, { status: 404 })
      }

      sds = logRes.rows[0].sds_code
      date = logRes.rows[0].report_date
    }

    else {
      return NextResponse.json(
        { error: "Invalid request mode" },
        { status: 400 }
      )
    }

    /* =====================================================
       STEP 2: FETCH DATA
       (branch = static, others = date based)
    ===================================================== */

    const [
      branchRes,
      memberRes,
      depositRes,
      loanRes,
      jewelRes,
      empRes,
      npaRes,
      profitRes,
      safetyRes
    ] = await Promise.all([

      // 🔹 branch is static (no date filter)
      client.query(
        `SELECT * FROM branch_details WHERE sdscode = $1`,
        [sds]
      ),

      client.query(
        `SELECT *, date::text AS date FROM members WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      ),

      client.query(
        `SELECT *, date::text AS date FROM deposits WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      ),

      client.query(
        `SELECT *, date::text AS date FROM loans WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      ),

      client.query(
        `SELECT *, date::text AS date FROM jewel_details WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      ),

      client.query(
        `SELECT *, date::text AS date FROM employee_details WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      ),

      client.query(
        `SELECT *, date::text AS date FROM npa_details WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      ),

      client.query(
        `SELECT *, date::text AS date FROM profit_details WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      ),

      client.query(
        `SELECT *, date::text AS date FROM safety_details WHERE sds_code = $1 AND date = $2`,
        [sds, date]
      )
    ])

    /* =====================================================
       STEP 3: RESPONSE (FRONTEND COMPATIBLE)
    ===================================================== */

    return NextResponse.json({
      branch: branchRes.rows || [],
      member: memberRes.rows || [],
      deposit: depositRes.rows || [],
      loan: loanRes.rows || [],
      jewel: jewelRes.rows || [],

      emp: empRes.rows[0] || null,
      npa: npaRes.rows[0] || null,
      profit: profitRes.rows[0] || null,
      safety: safetyRes.rows[0] || null,

      fromDate: date,
      sdsCode: sds
    })

  } catch (err) {
    console.error("GET REPORT ERROR:", err)
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}