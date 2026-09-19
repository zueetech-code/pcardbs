import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function sleep(ms: number) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    // ============================================================
    // 1. READ REQUEST
    // ============================================================

    const body = await req.json();

    console.log("📦 BODY:", body);

    const {
      clientId,
      date,
      modules = [],
    } = body;

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "clientId is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: "date is required",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // 2. GET CLIENT
    // ============================================================

    console.log(
      "🚀 RUN CLIENT:",
      clientId
    );

    console.log(
      "📦 MODULES:",
      modules
    );

    const clientRes = await client.query(
      `
      SELECT *
      FROM clients
      WHERE client_id = $1
      LIMIT 1
      `,
      [clientId]
    );

    const clientData =
      clientRes.rows[0];

    if (!clientData) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        {
          status: 404,
        }
      );
    }

    const agentUid =
      clientData.agent_uid;

    if (!agentUid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No agent assigned to this client",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // 3. GET ASSIGNED QUERIES
    // ============================================================
    //
    // IMPORTANT:
    //
    // Only queries assigned to this agent.
    //
    // ORDER BY created_at / id gives deterministic execution.
    //
    // ============================================================

    const queryRes = await client.query(
      `
      SELECT
        id,
        name,
        sql,
        assigned_agents,
        variables,
        created_at
      FROM queries
      WHERE $1 = ANY(assigned_agents)
      ORDER BY created_at ASC, id ASC
      `,
      [agentUid]
    );

    const queries =
      queryRes.rows;

    console.log(
      "📊 TOTAL ASSIGNED QUERIES:",
      queries.length
    );

    // ============================================================
    // 4. REPORT
    // ============================================================

    const report: any = {
      clientId,
      clientName: clientData.name,
      fromDate: date,

      branch: [],
      member: [],
      deposit: [],
      loan: [],
      jewel: [],
      memberwise: [],

      npa: {
        SDSCode: "TEMP_SDS",
        Date: date,
      },
    };

    // ============================================================
    // 5. FILTER QUERIES
    // ============================================================

    const selectedQueries =
      queries.filter((q: any) => {

        const name =
          String(q.name || "")
            .toLowerCase();

        // No module selection
        // => run every assigned query
        if (
          !Array.isArray(modules) ||
          modules.length === 0
        ) {
          return true;
        }

        // --------------------------------------------------------
        // Query classification
        // --------------------------------------------------------

        if (
          name.includes("memberwise")
        ) {
          return modules.includes(
            "memberwise"
          );
        }

        if (
          name.includes("jewel")
        ) {
          return modules.includes(
            "jewel"
          );
        }

        if (
          name.includes("branch")
        ) {
          return modules.includes(
            "branch"
          );
        }

        if (
          name.includes("deposit")
        ) {
          return (
            modules.includes("member") ||
            modules.includes("deposit") ||
            modules.includes("loan")
          );
        }

        // Query without known module keyword
        return true;
      });

    console.log(
      "📋 QUERIES TO EXECUTE:",
      selectedQueries.map(
        (q: any) => ({
          id: q.id,
          name: q.name,
        })
      )
    );

    // ============================================================
    // 6. EXECUTE ONE QUERY AT A TIME
    // ============================================================

    for (
      let index = 0;
      index < selectedQueries.length;
      index++
    ) {

      const q =
        selectedQueries[index];

      const queryNumber =
        index + 1;

      const queryName =
        q.name || `Query ${queryNumber}`;

      const queryNameLower =
        queryName.toLowerCase();

      console.log(
        "================================================"
      );

      console.log(
        `▶ START QUERY ${queryNumber}/${selectedQueries.length}:`,
        queryName
      );

      console.log(
        "🆔 QUERY ID:",
        q.id
      );

      // ==========================================================
      // 6.1 CREATE COMMAND
      // ==========================================================

      const cmdRes =
        await client.query(
          `
          INSERT INTO commands (
            client_id,
            agent_uid,
            query_id,
            sql,
            variables,
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'pending',
            NOW(),
            NOW()
          )
          RETURNING id
          `,
          [
            clientId,
            agentUid,
            q.id,
            q.sql,
            JSON.stringify({
              Fromdate: date,
            }),
          ]
        );

      const commandId =
        String(cmdRes.rows[0].id);

      console.log(
        "📤 COMMAND CREATED:",
        commandId
      );

      // ==========================================================
      // 6.2 WAIT UNTIL AGENT FINISHES THIS QUERY
      // ==========================================================
      //
      // Query 2 is NOT created yet.
      //
      // ==========================================================

      let status = "pending";

      const startedWaiting =
        Date.now();

      const MAX_WAIT =
        30 * 60 * 1000; // 30 minutes

      while (true) {

        const statusRes =
          await client.query(
            `
            SELECT
              status,
              result,
              error,
              completed_at
            FROM commands
            WHERE id = $1
            LIMIT 1
            `,
            [commandId]
          );

        if (
          statusRes.rows.length === 0
        ) {
          throw new Error(
            `Command ${commandId} disappeared`
          );
        }

        const commandStatus =
          statusRes.rows[0];

        status =
          commandStatus.status;

        console.log(
          `⏳ QUERY ${queryNumber} STATUS:`,
          status
        );

        // --------------------------------------------------------
        // SUCCESS
        // --------------------------------------------------------

        if (
          status === "success"
        ) {
          break;
        }

        // --------------------------------------------------------
        // FAILED
        // --------------------------------------------------------

        if (
          status === "failed"
        ) {
          console.error(
            `❌ QUERY FAILED: ${queryName}`,
            commandStatus.error ||
              commandStatus.result
          );

          break;
        }

        // --------------------------------------------------------
        // TIMEOUT
        // --------------------------------------------------------

        if (
          Date.now() -
            startedWaiting >
          MAX_WAIT
        ) {

          await client.query(
            `
            UPDATE commands
            SET
              status = 'failed',
              error = $2,
              result = $2,
              completed_at = NOW(),
              updated_at = NOW()
            WHERE id = $1
              AND status IN ('pending', 'running')
            `,
            [
              commandId,
              "Command execution timeout after 30 minutes",
            ]
          );

          status = "failed";

          console.error(
            `⏰ QUERY TIMEOUT: ${queryName}`
          );

          break;
        }

        // --------------------------------------------------------
        // WAIT
        // --------------------------------------------------------

        await sleep(1500);
      }

      // ==========================================================
      // 6.3 FAILED QUERY
      // ==========================================================

      if (
        status !== "success"
      ) {

        console.error(
          `⚠ Skipping failed query: ${queryName}`
        );

        // Continue to next assigned query
        continue;
      }

      // ==========================================================
      // 6.4 FETCH RESULT
      // ==========================================================

      console.log(
        `📥 FETCH RESULT FOR: ${queryName}`
      );

      const resultRes =
        await client.query(
          `
          SELECT
            id,
            command_id,
            table_name,
            query_type,
            row_count,
            columns,
            row_data,
            created_at
          FROM query_results
          WHERE command_id = $1
          ORDER BY id DESC
          LIMIT 1
          `,
          [commandId]
        );

      if (
        resultRes.rows.length === 0
      ) {

        console.error(
          `⚠ NO RESULT FOR: ${queryName}`
        );

        continue;
      }

      const storedResult =
        resultRes.rows[0];

      const resultData =
        storedResult.row_data || {};

      const rows =
        Array.isArray(
          resultData.rows
        )
          ? resultData.rows
          : [];

      console.log(
        `📊 RESULT ROWS: ${rows.length}`
      );

      // ==========================================================
      // 6.5 SDS CODE
      // ==========================================================

      let sdsCode =
        report.npa?.SDSCode;

      if (
        !sdsCode ||
        sdsCode === "TEMP_SDS"
      ) {

        for (
          const row of rows
        ) {

          const detected =
            row?.sdscode ??
            row?.SDSCODE ??
            row?.sds_code ??
            row?.sdsCode ??
            null;

          if (detected) {
            sdsCode =
              String(detected);

            break;
          }
        }
      }

      if (
        sdsCode &&
        sdsCode !== "TEMP_SDS"
      ) {

        report.npa.SDSCode =
          sdsCode;

        console.log(
          "📌 SDS CODE:",
          sdsCode
        );
      }

      // ==========================================================
      // 6.6 MAP RESULT INTO REPORT
      // ==========================================================

      if (
        queryNameLower.includes(
          "branch"
        )
      ) {

        if (
          !Array.isArray(
            report.branch
          )
        ) {
          report.branch = [];
        }

        report.branch.push(
          ...rows
        );
      }

      // ----------------------------------------------------------
      // MEMBER / DEPOSIT / LOAN
      // ----------------------------------------------------------

      if (
        queryNameLower.includes(
          "deposit"
        )
      ) {

        const members =
          rows.filter(
            (r: any) =>
              String(
                r?.modules || ""
              ).toLowerCase() ===
              "members"
          );

        const deposits =
          rows.filter(
            (r: any) =>
              String(
                r?.modules || ""
              ).toLowerCase() ===
              "deposits"
          );

        const loans =
          rows.filter(
            (r: any) =>
              String(
                r?.modules || ""
              ).toLowerCase() ===
              "loans"
          );

        if (
          !Array.isArray(
            report.member
          )
        ) {
          report.member = [];
        }

        if (
          !Array.isArray(
            report.deposit
          )
        ) {
          report.deposit = [];
        }

        if (
          !Array.isArray(
            report.loan
          )
        ) {
          report.loan = [];
        }

        if (
          modules.length === 0 ||
          modules.includes("member")
        ) {
          report.member.push(
            ...members
          );
        }

        if (
          modules.length === 0 ||
          modules.includes("deposit")
        ) {
          report.deposit.push(
            ...deposits
          );
        }

        if (
          modules.length === 0 ||
          modules.includes("loan")
        ) {
          report.loan.push(
            ...loans
          );
        }
      }

      // ----------------------------------------------------------
      // JEWEL
      // ----------------------------------------------------------

      if (
        queryNameLower.includes(
          "jewel"
        )
      ) {

        if (
          !Array.isArray(
            report.jewel
          )
        ) {
          report.jewel = [];
        }

        if (
          modules.length === 0 ||
          modules.includes("jewel")
        ) {
          report.jewel.push(
            ...rows
          );
        }
      }

      // ----------------------------------------------------------
      // MEMBERWISE
      // ----------------------------------------------------------

      if (
        queryNameLower.includes(
          "memberwise"
        )
      ) {

        if (
          !Array.isArray(
            report.memberwise
          )
        ) {
          report.memberwise = [];
        }

        if (
          modules.length === 0 ||
          modules.includes("memberwise")
        ) {
          report.memberwise.push(
            ...rows
          );
        }
      }

      // ==========================================================
      // 6.7 SAVE PARTIAL REPORT
      // ==========================================================

      const partialReport = {
        clientId,

        clientName:
          clientData.name,

        fromDate: date,

        npa: {
          SDSCode:
            report.npa.SDSCode ||
            "TEMP_SDS",

          Date: date,
        },

        branch:
          report.branch,

        member:
          report.member,

        deposit:
          report.deposit,

        loan:
          report.loan,

        jewel:
          report.jewel,

        memberwise:
          report.memberwise,
      };

      // ==========================================================
      // SAVE REPORT
      // ==========================================================

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL;

      if (!baseUrl) {
        throw new Error(
          "NEXT_PUBLIC_BASE_URL is not configured"
        );
      }

      console.log(
        "💾 SAVING PARTIAL REPORT:",
        queryName
      );

      const saveRes =
        await fetch(
          `${baseUrl}/api/save-report`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                partialReport
              ),
          }
        );

      let saveData: any;

      try {
        saveData =
          await saveRes.json();
      } catch {
        saveData = null;
      }

      if (
        !saveRes.ok
      ) {

        console.error(
          "❌ SAVE FAILED:",
          saveData
        );

      } else {

        console.log(
          "✅ PARTIAL REPORT SAVED:",
          queryName
        );
      }

      // ==========================================================
      // 6.8 QUERY FINISHED
      // ==========================================================

      console.log(
        `✅ QUERY ${queryNumber}/${selectedQueries.length} FINISHED:`,
        queryName
      );

      console.log(
        "------------------------------------------------"
      );

      // ==========================================================
      // NEXT LOOP ITERATION
      //
      // ONLY NOW WILL THE NEXT COMMAND BE CREATED.
      //
      // ==========================================================
    }

    // ============================================================
    // 7. FINAL NPA
    // ============================================================

    if (
      report.npa.SDSCode ===
      "TEMP_SDS"
    ) {

      const branchSds =
        report.branch?.[0]?.sdscode ??
        report.branch?.[0]?.SDSCODE ??
        report.branch?.[0]?.sds_code ??
        report.branch?.[0]?.sdsCode ??
        null;

      if (branchSds) {
        report.npa.SDSCode =
          String(branchSds);
      }
    }

    report.npa.Date =
      date;

    // ============================================================
    // 8. COLUMN ORDERS
    // ============================================================

    report.branchColumnOrder =
      report.branch.length > 0
        ? Object.keys(
            report.branch[0]
          )
        : [];

    report.memberColumnOrder =
      report.member.length > 0
        ? Object.keys(
            report.member[0]
          )
        : [];

    report.depositColumnOrder =
      report.deposit.length > 0
        ? Object.keys(
            report.deposit[0]
          )
        : [];

    report.loanColumnOrder =
      report.loan.length > 0
        ? Object.keys(
            report.loan[0]
          )
        : [];

    report.jewelColumnOrder =
      report.jewel.length > 0
        ? Object.keys(
            report.jewel[0]
          )
        : [];

    report.MemberColumnOrder =
      report.memberwise.length > 0
        ? Object.keys(
            report.memberwise[0]
          )
        : [];

    // ============================================================
    // 9. DEBUG
    // ============================================================

    console.log(
      "================================================"
    );

    console.log(
      "📦 FINAL REPORT"
    );

    console.log({
      member:
        report.member.length,

      deposit:
        report.deposit.length,

      loan:
        report.loan.length,

      jewel:
        report.jewel.length,

      memberwise:
        report.memberwise.length,

      branch:
        report.branch.length,

      SDSCode:
        report.npa.SDSCode,
    });

    console.log(
      "================================================"
    );

    // ============================================================
    // 10. RETURN
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "All assigned queries processed sequentially",

        totalQueries:
          selectedQueries.length,

        report,
      },
      {
        status: 200,
      }
    );

  } catch (err: any) {

    console.error(
      "🔥 RUN CLIENT ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        error:
          err?.message ||
          "Server error",
      },
      {
        status: 500,
      }
    );

  } finally {
    client.release();
  }
}