import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import https from "https"
import { logPushStatus } from "@/lib/pushLogger"
export const runtime = "nodejs"

/* ================= CONFIG ================= */

const DRY_RUN = process.env.RCS_DRY_RUN === "true"
const BATCH_SIZE = 10
const REQUEST_TIMEOUT = 15000

const DEPOSIT_LOAN_URL =
  "https://dashboard.kooturavu.tn.gov.in/v1/api/uccs/deposit_loan/upsert"

const JEWEL_URL =
  "https://dashboard.kooturavu.tn.gov.in/v1/api/uccs/jwel/upsert"

/* ================= KEEP ALIVE ================= */

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
})
const toDateOnly = (value: string) => {
  if (!value) return "—"

  // Already in YYYY-MM-DD → return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const d = new Date(value)

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}` // LOCAL (IST safe)
}

/* ================= SAFE FETCH ================= */

async function safeFetch(url: string, payload: any, retries = 3) {

  for (let attempt = 1; attempt <= retries; attempt++) {

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.RCS_API_KEY!,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        // @ts-ignore
        agent: httpsAgent,
      })

      const text = await res.text()

      let data
      try { data = JSON.parse(text) } catch { data = text }

      clearTimeout(timeout)

      return data

    } catch (err: any) {

      clearTimeout(timeout)

      if (attempt === retries) {
        return { error: err.message }
      }

      console.log(`Retry ${attempt} failed... retrying`)

      await new Promise(r => setTimeout(r, 2000))
    }
  }
}

/* ================= API ================= */

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key")
  if (apiKey !== process.env.PUSH_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { clientNames, fromDate } = await req.json()
  if (!Array.isArray(clientNames) || clientNames.length === 0) {
    return NextResponse.json({ error: "clientNames[] required" }, { status: 400 })
  }
  if (!fromDate) {
    return NextResponse.json({ error: "fromDate required" }, { status: 400 })
  }

  const results: any[] = []
  const client = await pool.connect()

  try {
    for (const clientName of clientNames) {
      try {
        /* ---------- LAST REPORT ---------- */
        const last = await client.query(
          `
          SELECT sds_code, report_date
        FROM report_insert_log
        WHERE client_name = $1
          AND report_date = $2
        ORDER BY created_at DESC
        LIMIT 1
          `,
          [clientName,fromDate]
        )

         if (!last.rowCount) {
          results.push({
            clientName,
            pushedDate: fromDate,
            error: "No submission found for this date",
          })
          continue
        }

        const { sds_code, report_date } = last.rows[0]

        /* ---------- FETCH DATA ---------- */
        const [members, deposits, loans, jewels] = await Promise.all([
          client.query(`SELECT * FROM members WHERE sds_code=$1 AND date=$2`, [sds_code, report_date]),
          client.query(`SELECT * FROM deposits WHERE sds_code=$1 AND date=$2`, [sds_code, report_date]),
          client.query(`SELECT * FROM loans WHERE sds_code=$1 AND date=$2`, [sds_code, report_date]),
          client.query(`SELECT * FROM jewel_details WHERE sds_code=$1 AND date=$2`, [sds_code, report_date]),
        ])

        const depositLoanResponses: any[] = []
        const jewelResponses: any[] = []

        /* ---------- DEPOSIT / LOAN / MEMBER ---------- */
        const combined = [
          ...members.rows.map(r => ({ ...r, modules: "Members" })),
          ...deposits.rows.map(r => ({ ...r, modules: "Deposits" })),
          ...loans.rows.map(r => ({ ...r, modules: "Loans" })),
        ]

        for (let i = 0; i < combined.length; i += BATCH_SIZE) {
          const batch = combined.slice(i, i + BATCH_SIZE)

          await Promise.all(batch.map(async r => {
            const payload = {
              sds_code: r.sds_code,
              date: toDateOnly(r.date),
              schm_code: r.schm_code,
              branch_name: r.branch_name,
              modules: r.modules,
              scheme_description: r.scheme_description,
              upto_month_count: Number(r.upto_month_count || 0),
              upto_month_balance: Number(r.upto_month_balance || 0),
              receipt_count: Number(r.receipt_count || 0),
              receipt_amt: Number(r.receipt_amt || 0),
              payment_count: Number(r.payment_count || 0),
              payment_amt: Number(r.payment_amt || 0),
              close_count: Number(r.close_count || 0),
              close_amt: Number(r.close_amt || 0),
            }

            const res = DRY_RUN
              ? { dryRun: true, payload }
              : await safeFetch(DEPOSIT_LOAN_URL, payload)

            depositLoanResponses.push(res)
            await logPushStatus({
                        source: "Server",
                        clientName,
                        fromDate,
                        module: "DEPOSIT/LOAN/MEMBER",
                        response: res,
                        status: DRY_RUN ? "DRY_RUN" : res?.success ? "SUCCESS" : "FAILED",
                      })
          }))
        }

        /* ---------- JEWEL ---------- */
        for (let i = 0; i < jewels.rows.length; i += BATCH_SIZE) {
          const batch = jewels.rows.slice(i, i + BATCH_SIZE)

          await Promise.all(batch.map(async r => {
            const payload = {
              sds_code: r.sds_code,
              date: toDateOnly(r.date),
              branch_name: r.branch_name,
              no_of_loans: Number(r.no_of_loans || 0),
              gross_weight_grams: Number(r.gross_weight_grams || 0),
              net_weight_grams: Number(r.net_weight_grams || 0),
              market_value_crores: Number(r.market_value_crores || 0),
              net_market_value_crores: Number(r.net_market_value_crores || 0),
            }

            const res = DRY_RUN
              ? { dryRun: true, payload }
              : await safeFetch(JEWEL_URL, payload)

            jewelResponses.push(res)
            await logPushStatus({
                        source: "Server",
                        clientName,
                        fromDate,
                        module: "JEWEL",
                        response: res,
                        status: DRY_RUN ? "DRY_RUN" : res?.success ? "SUCCESS" : "FAILED",
                      })
          }))
        }

        results.push({
          clientName,
          report_date: toDateOnly(report_date),
          deposit_loan: depositLoanResponses,
          jewel: jewelResponses,
        })

      } catch (err: any) {
        results.push({ clientName, error: err.message })
      }
    }

    return NextResponse.json({
      source: "Server",
      mode: DRY_RUN ? "DRY_RUN" : "LIVE",
      results,
    })

  } finally {
    client.release()
  }
}