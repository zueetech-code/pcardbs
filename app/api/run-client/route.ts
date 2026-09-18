import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(req: Request) {

  const body = await req.json()
  console.log("📦 BODY:", body)

  const { clientId, date, modules = [] } = body

  const client = await pool.connect()
 

  try {

    console.log("🚀 RUN CLIENT:", clientId)
    console.log("📦 MODULES:", modules)

    /* ================= GET CLIENT ================= */

    const clientRes = await client.query(
      `SELECT * FROM clients WHERE client_id = $1`,
      [clientId]
    )

    const clientData = clientRes.rows[0]
    let globalSDSCode: string | null = null
    

    if (!clientData) {
      return NextResponse.json({ error: "Client not found" })
    }

    const agentUid = clientData.agent_uid

    /* ================= GET QUERIES ================= */

    const queryRes = await client.query(
      `SELECT * FROM queries WHERE $1 = ANY(assigned_agents)`,
      [agentUid]
    )

    const queries = queryRes.rows

    console.log("📊 TOTAL QUERIES:", queries.length)

    /* ================= REPORT INIT ================= */

    const report: any = {
      clientId,
      clientName: clientData.name,
      fromDate: date,

      branch: [],
      member: [],
      deposit: [],
      loan: [],
      jewel: [],
      memberwise:[]
    }

    /* ================= RUN QUERIES ================= */

    for (const q of queries) {

      const name = (q.name || "").toLowerCase()

      /* 🔥 MODULE FILTERING */

      if (modules.length > 0) {

  let shouldRun = false;

  if (
      (modules.includes("member") && name.includes("deposit")) ||
      (modules.includes("deposit") && name.includes("deposit")) ||
      (modules.includes("loan") && name.includes("deposit")) ||
      (modules.includes("jewel") && name.includes("jewel")) ||
      (modules.includes("branch") && name.includes("branch")) ||
      (modules.includes("memberwise") && name.includes("memberwise"))
  ) {
      shouldRun = true;
  }

  // Query has no module keyword -> run it
  if (
      !name.includes("deposit") &&
      !name.includes("jewel") &&
      !name.includes("branch") &&
      !name.includes("memberwise") 
  ) {
      shouldRun = true;
  }

  if (!shouldRun) {
      console.log("⏭ Skipping query:", q.name);
      continue;
  }
}

      console.log("▶ Running query:", q.name)

      /* ===== CREATE COMMAND ===== */

      const cmdRes = await client.query(
        `
        INSERT INTO commands (
          client_id, agent_uid, query_id, sql,
          variables, status, created_at
        )
        VALUES ($1,$2,$3,$4,$5,'pending',NOW())
        RETURNING id
        `,
        [
          clientId,
          agentUid,
          q.id,
          q.sql,
          JSON.stringify({ Fromdate: date })
        ]
      )

      const commandId = cmdRes.rows[0].id

      /* ===== WAIT FOR AGENT ===== */

      let status = "pending"

      while (true) {

        const statusRes = await client.query(
          `SELECT status FROM commands WHERE id=$1`,
          [commandId]
        )

        status = statusRes.rows[0]?.status

        if (status === "success" || status === "failed") break

        await new Promise(r => setTimeout(r, 1500))
      }

      console.log("✔ Query status:", status)

      if (status !== "success") continue

      /* ===== FETCH RESULTS ===== */

      const resultRes = await client.query(
        `
        SELECT row_data
        FROM query_results
        WHERE command_id = $1
        `,
        [commandId]
      )

      if (!resultRes.rows.length) {
        console.log("⚠ No results:", q.name)
        continue
      }

      const rows =
  resultRes.rows[0]?.row_data?.rows || []
      // 🔥 CAPTURE SDS FROM ANY QUERY RESULT

if (!globalSDSCode && rows.length > 0) {

  const firstRow = rows[0]

  globalSDSCode =
    firstRow?.sdscode ||
    firstRow?.SDSCODE ||
    firstRow?.sds_code ||
    firstRow?.sdsCode ||
    null

  console.log("📌 SDS DETECTED:", globalSDSCode, "FROM:", q.name)
}

/* ================= ADD HERE ================= */

/* 🔹 BUILD PARTIAL REPORT */

const partialReport: any = {
  clientName: clientData.name,
  npa: {
    SDSCode: globalSDSCode  ||
      "TEMP_SDS",
    Date: date
  },
 
}

/* 🔹 MAP MODULE DATA */

if (name.includes("deposit")) {

  partialReport.member = rows.filter((r:any)=>
    (r.modules || "").toLowerCase() === "members"
  )

  partialReport.deposit = rows.filter((r:any)=>
    (r.modules || "").toLowerCase() === "deposits"
  )

  partialReport.loan = rows.filter((r:any)=>
    (r.modules || "").toLowerCase() === "loans"
  )
}

if (name.includes("jewel")) {
  partialReport.jewel = rows
}

if (name.includes("branch")) {
  partialReport.branch = rows
}

if (name.includes("memberwise")) {
  partialReport.memberwise = rows
}

/* 🔹 CALL SAVE REPORT */

const saveRes = await fetch(
  process.env.NEXT_PUBLIC_BASE_URL + "/api/save-report",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(partialReport)
  }
)

const saveData = await saveRes.json()
console.log(saveData)

if (!saveRes.ok) {
  console.error("❌ SAVE FAILED:", saveData)
} else {
  console.log("✅ SAVED:", q.name)
}

/* ================= CONTINUE NORMAL FLOW ================= */

      /* ================= MAP DATA ================= */

      // ✅ BRANCH
      if (name.includes("branch")) {
        report.branch.push(...rows)
        
      }

      // ✅ MEMBER / DEPOSIT / LOAN (same query)
      if (name.includes("deposit")) {

        const members = rows.filter((r:any)=>
          (r.modules || "").toLowerCase() === "members"
        )

        const deposits = rows.filter((r:any)=>
          (r.modules || "").toLowerCase() === "deposits"
        )

        const loans = rows.filter((r:any)=>
          (r.modules || "").toLowerCase() === "loans"
        )

        if (modules.length === 0 || modules.includes("member"))
          report.member.push(...members)

        if (modules.length === 0 || modules.includes("deposit"))
          report.deposit.push(...deposits)

        if (modules.length === 0 || modules.includes("loan"))
          report.loan.push(...loans)
      }

      // ✅ JEWEL
      if (name.includes("jewel")) {
        if (modules.length === 0 || modules.includes("jewel"))
          report.jewel.push(...rows)
      }
      if (name.includes("memberwise")) {
         if (modules.length === 0 || modules.includes("memberwise"))
          report.memberwise.push(...rows)
      }
    }

    /* ================= NPA FALLBACK ================= */

    report.npa = {
      SDSCode:
        report.branch?.[0]?.sdscode ||
        report.branch?.[0]?.SDSCODE ||
        "TEMP_SDS",
      Date: date
    }

    /* ================= COLUMN ORDER ================= */

    report.branchColumnOrder =
      report.branch.length ? Object.keys(report.branch[0]) : []

    report.memberColumnOrder =
      report.member.length ? Object.keys(report.member[0]) : []

    report.depositColumnOrder =
      report.deposit.length ? Object.keys(report.deposit[0]) : []

    report.loanColumnOrder =
      report.loan.length ? Object.keys(report.loan[0]) : []

    report.jewelColumnOrder =
      report.jewel.length ? Object.keys(report.jewel[0]) : []

    report.MemberColumnOrder= 
      report.memberwise.length ? Object.keys(report.memberwise[0]) : []

    /* ================= DEBUG ================= */

    console.log("📦 FINAL REPORT:", {
      member: report.member.length,
      deposit: report.deposit.length,
      loan: report.loan.length,
      jewel: report.jewel.length,
      memberwise: report.memberwise.length,
    })

    /* ================= RETURN ================= */

    return NextResponse.json({
      success: true,
      report
    })

  } catch (err: any) {

    console.error("🔥 RUN CLIENT ERROR:", err)

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    )

  } finally {
    client.release()
  }
}