import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { logPushStatus } from "@/lib/pushLogger"
import https from "https"
export const runtime = "nodejs"
/* ================= CONFIG ================= */

const DRY_RUN = process.env.RCS_DRY_RUN === "true"
const BATCH_SIZE = 10
const REQUEST_TIMEOUT = 15000

const DEPOSIT_LOAN_URL =
  "https://dashboard.kooturavu.tn.gov.in/v1/api/uccs/deposit_loan/upsert"

const JEWEL_URL =
  "https://dashboard.kooturavu.tn.gov.in/v1/api/uccs/jwel/upsert"

/* ================= SAFE FETCH ================= */

/* ================= SAFE FETCH ================= */

async function safeFetch(url: string, payload: any, retries = 3) {

  for (let attempt = 1; attempt <= retries; attempt++) {

    try {

      const controller = new AbortController()

      const timeout = setTimeout(() => {
        controller.abort()
      }, REQUEST_TIMEOUT)

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.RCS_API_KEY!,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const text = await res.text()

      try {
        return JSON.parse(text)
      } catch {
        return text
      }

    } catch (err: any) {

      if (attempt === retries) {
        return { error: err.message }
      }

      console.log(`Retry ${attempt} failed. Retrying...`)

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
  if (!Array.isArray(clientNames) || !fromDate) {
    return NextResponse.json({ error: "clientNames[] & fromDate required" }, { status: 400 })
  }

  const results: any[] = []

  for (const clientName of clientNames) {
    try {
      const docId = `${clientName}_${fromDate}`
      const snap = await adminDb.collection("final_reports").doc(docId).get()

      if (!snap.exists) {
        results.push({ clientName, error: "Report not found" })
        continue
      }

      const report = snap.data()!
      const depositLoanResponses: any[] = []
      const jewelResponses: any[] = []

      const combined = [
        ...(report.member || []),
        ...(report.deposit || []),
        ...(report.loan || []),
      ]

      for (let i = 0; i < combined.length; i += BATCH_SIZE) {
        const batch = combined.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async row => {
          const payload = {
            sds_code: row.sds_code,
            date: row.date,
            schm_code: row.schm_code,
            branch_name: row.branch_name,
            modules: row.modules,
            scheme_description: row.scheme_description,
            upto_month_count: Number(row.upto_month_count || 0),
            upto_month_balance: Number(row.upto_month_balance || 0),
            receipt_count: Number(row.receipt_count || 0),
            receipt_amt: Number(row.receipt_amt || 0),
            payment_count: Number(row.payment_count || 0),
            payment_amt: Number(row.payment_amt || 0),
            close_count: Number(row.close_count || 0),
            close_amt: Number(row.close_amt || 0),
          }

          const res = DRY_RUN
            ? { dryRun: true, payload }
            : await safeFetch(DEPOSIT_LOAN_URL, payload)

          depositLoanResponses.push(res)

          await logPushStatus({
            source: "FIREBASE",
            clientName,
            fromDate,
            module: "DEPOSIT/LOAN/MEMBER",
            response: res,
            status: DRY_RUN ? "DRY_RUN" : res?.success ? "SUCCESS" : "FAILED",
          })
        }))
      }

      for (let i = 0; i < (report.jewel || []).length; i += BATCH_SIZE) {
        const batch = report.jewel.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async (row: { sds_code: any; date: any; branch_name: any; no_of_loans: any; gross_weight_grams: any; net_weight_grams: any; market_value_crores: any; net_market_value_crores: any }) => {
          const payload = {
            sds_code: row.sds_code,
            date: row.date,
            branch_name: row.branch_name,
            no_of_loans: Number(row.no_of_loans || 0),
            gross_weight_grams: Number(row.gross_weight_grams || 0),
            net_weight_grams: Number(row.net_weight_grams || 0),
            market_value_crores: Number(row.market_value_crores || 0),
            net_market_value_crores: Number(row.net_market_value_crores || 0),
          }

          const res = DRY_RUN
            ? { dryRun: true, payload }
            : await safeFetch(JEWEL_URL, payload)

          jewelResponses.push(res)

          await logPushStatus({
            source: "FIREBASE",
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
        fromDate,
        deposit_loan: depositLoanResponses,
        jewel: jewelResponses,
      })

    } catch (err: any) {
      results.push({ clientName, error: err.message })
    }
  }

  return NextResponse.json({
    source: "RCS_DASHBOARD",
    mode: DRY_RUN ? "DRY_RUN" : "LIVE",
    results,
  })
}