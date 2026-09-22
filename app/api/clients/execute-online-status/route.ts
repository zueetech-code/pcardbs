import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const COMMAND_TIMEOUT = 120000; // 2 minutes
const POLL_INTERVAL = 2000;     // 2 seconds

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTodayString() {
  const today = new Date();

  return (
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")
  );
}

/* ============================================================
   EXTRACT FIRST ROW FROM query_results.row_data
============================================================ */

function extractRow(rowData: any) {

  let data = rowData;

  // JSON string
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Double JSON
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  /*
    Expected:

    {
      columns: [...],
      rowCount: 1,
      rows: [
        {
          lastdate: "...",
          closingbalance: "..."
        }
      ]
    }
  */

  if (data && Array.isArray(data.rows)) {
    return data.rows[0] || null;
  }

  // Direct array
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  // Direct object
  if (
    data &&
    typeof data === "object"
  ) {
    return data;
  }

  return null;
}


/* ============================================================
   POST
============================================================ */

export async function POST(
  request: NextRequest
) {

  try {

    console.log("");
    console.log("==============================================");
    console.log("🚀 CHECK ONLINE STATUS");
    console.log("==============================================");


    /* ========================================================
       1. REQUEST
    ======================================================== */

    let body: any = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }


    const queryId =
      typeof body.queryId === "string"
        ? body.queryId.trim()
        : "";


    const district =
      typeof body.district === "string"
        ? body.district.trim()
        : "ALL";


    if (!queryId) {

      return NextResponse.json(
        {
          success: false,
          error: "queryId is required"
        },
        {
          status: 400
        }
      );

    }


    console.log("🔎 Query ID:", queryId);
    console.log("📍 District:", district);


    /* ========================================================
       2. DATE
    ======================================================== */

    const todayStr =
      getTodayString();


    /* ========================================================
       3. GET ONLINE CLIENTS
       
       ONLY:
       
       status = online
       last_seen <= 1 minute
       client_id matches
       selected district
    ======================================================== */

    let clientsQuery = `
      SELECT
        c.client_id,
        c.name,
        c.district,

        ah.agent_uid,
        ah.agent_email,
        ah.agent_version,
        ah.status,
        ah.last_seen

      FROM clients c

      INNER JOIN agent_heartbeats ah
        ON ah.client_id = c.client_id

      WHERE
        ah.status = 'online'

        AND ah.last_seen >=
          NOW() - INTERVAL '1 minute'
    `;


    const params: any[] = [];


    /* ========================================================
       4. DISTRICT FILTER
    ======================================================== */

    if (
      district &&
      district.toUpperCase() !== "ALL"
    ) {

      params.push(district);

      clientsQuery += `
        AND c.district = $${params.length}
      `;

    }


    clientsQuery += `
      ORDER BY ah.last_seen DESC
    `;


    const clientsRes =
      await pool.query(
        clientsQuery,
        params
      );


    console.log(
      "🟢 Online clients:",
      clientsRes.rows.length
    );


    if (
      clientsRes.rows.length === 0
    ) {

      return NextResponse.json({

        success: true,

        queryId,

        district,

        date: todayStr,

        onlineClients: 0,

        commandsCreated: 0,

        processedClients: 0,

        failedClients: 0,

        message:
          district.toUpperCase() === "ALL"
            ? "No online clients"
            : `No online clients in ${district}`

      });

    }


    let commandsCreated = 0;
    let processedClients = 0;
    let failedClients = 0;


    const results: any[] = [];


    /* ========================================================
       5. LOOP CLIENTS
    ======================================================== */

    for (
      const client of clientsRes.rows
    ) {

      const clientId =
        client.client_id;

      const clientName =
        client.name;

      const agentUid =
        client.agent_uid;


      console.log("");
      console.log(
        "----------------------------------------------"
      );

      console.log(
        "👤 Client:",
        clientName
      );

      console.log(
        "🆔 Client ID:",
        clientId
      );

      console.log(
        "📍 District:",
        client.district
      );

      console.log(
        "🤖 Agent UID:",
        agentUid
      );

      console.log(
        "❤️ Last seen:",
        client.last_seen
      );


      /* ======================================================
         6. AGENT UID
      ====================================================== */

      if (!agentUid) {

        console.log(
          "⚠️ Missing agent_uid:",
          clientName
        );

        failedClients++;

        results.push({

          clientId,

          clientName,

          success: false,

          error:
            "agent_uid missing"

        });

        continue;
      }


      /* ======================================================
         7. CREATE COMMAND
      ====================================================== */

      const commandRes =
        await pool.query(`
          INSERT INTO commands
          (
            id,
            client_id,
            agent_uid,
            status,
            query_id,
            variables,
            created_at
          )

          VALUES
          (
            gen_random_uuid(),
            $1,
            $2,
            'pending',
            $3,
            $4,
            NOW()
          )

          RETURNING id
        `, [

          clientId,

          agentUid,

          queryId,

          JSON.stringify({
            Fromdate: todayStr
          })

        ]);


      const commandId =
        commandRes.rows[0].id;


      commandsCreated++;


      console.log(
        "✅ Command created:",
        commandId
      );


      /* ======================================================
         8. WAIT FOR AGENT
         
         Agent will:
         
         pending
           ↓
         running
           ↓
         query_results
           ↓
         success
      ====================================================== */

      let commandStatus =
        "pending";

      const startTime =
        Date.now();


      while (
        Date.now() - startTime <
        COMMAND_TIMEOUT
      ) {

        await sleep(
          POLL_INTERVAL
        );


        const statusRes =
          await pool.query(`
            SELECT
              status
            FROM commands
            WHERE id = $1
            LIMIT 1
          `, [
            commandId
          ]);


        if (
          statusRes.rows.length === 0
        ) {

          commandStatus =
            "missing";

          break;

        }


        commandStatus =
          String(
            statusRes.rows[0].status
          )
            .trim()
            .toLowerCase();


        console.log(
          `⏳ ${clientName} → ${commandStatus}`
        );


        if (
          commandStatus === "success"
        ) {

          break;

        }


        if (
          commandStatus === "failed"
        ) {

          break;

        }

      }


      /* ======================================================
         9. COMMAND FAILED / TIMEOUT
      ====================================================== */

      if (
        commandStatus !== "success"
      ) {

        console.log(
          "❌ Command failed:",
          clientName,
          commandStatus
        );


        failedClients++;


        results.push({

          clientId,

          clientName,

          commandId,

          success: false,

          status:
            commandStatus

        });


        continue;

      }


      /* ======================================================
         10. GET RESULT FOR THIS EXACT COMMAND
      ====================================================== */

      console.log(
        "📦 Getting query result:",
        commandId
      );


      const resultRes =
        await pool.query(`
          SELECT
            row_data,
            row_count,
            columns,
            created_at
          FROM query_results
          WHERE command_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, [
          commandId
        ]);


      if (
        resultRes.rows.length === 0
      ) {

        console.log(
          "❌ query_results not found:",
          commandId
        );


        failedClients++;


        results.push({

          clientId,

          clientName,

          commandId,

          success: false,

          error:
            "query_results not found"

        });


        continue;

      }


      /* ======================================================
         11. EXTRACT RESULT ROW
      ====================================================== */

      const row =
        extractRow(
          resultRes.rows[0].row_data
        );


      console.log(
        "📦 Result row:",
        JSON.stringify(row)
      );


      if (!row) {

        console.log(
          "❌ Unable to extract result row"
        );


        failedClients++;


        results.push({

          clientId,

          clientName,

          commandId,

          success: false,

          error:
            "Unable to parse row_data"

        });


        continue;

      }


      /* ======================================================
         12. GET LASTDATE
      ====================================================== */

      const lastClosingDate =
        row.lastdate ??
        row.last_date ??
        row.closingdate ??
        row.closing_date ??
        null;


      /* ======================================================
         13. GET CLOSING BALANCE
      ====================================================== */

      let lastClosingBalance =
        row.closingbalance ??
        row.closing_balance ??
        null;


      if (
        typeof lastClosingBalance === "string"
      ) {

        lastClosingBalance =
          lastClosingBalance.replace(
            /[^0-9.-]+/g,
            ""
          );

      }


      if (
        lastClosingBalance === null ||
        lastClosingBalance === ""
      ) {

        lastClosingBalance = 0;

      }


      lastClosingBalance =
        Number(lastClosingBalance);


      if (
        Number.isNaN(lastClosingBalance)
      ) {

        lastClosingBalance = 0;

      }


      console.log(
        "📅 Closing date:",
        lastClosingDate
      );

      console.log(
        "💰 Closing balance:",
        lastClosingBalance
      );


      /* ======================================================
         14. INSERT CASH BALANCE
      ====================================================== */

      if (!lastClosingDate) {

        console.log(
          "⚠️ No lastdate returned:",
          clientName
        );


        failedClients++;


        results.push({

          clientId,

          clientName,

          commandId,

          success: false,

          error:
            "lastdate missing"

        });


        continue;

      }


      const cashRes =
        await pool.query(`
          INSERT INTO cash_balance
          (
            client_id,
            client_name,
            district,
            email,
            last_closing_balance,
            last_closing_date,
            updated_at
          )

          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW()
          )

          ON CONFLICT
          (
            client_name,
            last_closing_date
          )

          DO UPDATE SET

            client_id =
              EXCLUDED.client_id,

            district =
              EXCLUDED.district,

            email =
              EXCLUDED.email,

            last_closing_balance =
              EXCLUDED.last_closing_balance,

            updated_at =
              NOW()

          RETURNING *
        `, [

          clientId,

          clientName,

          client.district,

          client.agent_email,

          lastClosingBalance,

          lastClosingDate

        ]);


      /* ======================================================
         15. CASH BALANCE SUCCESS
      ====================================================== */

      console.log(
        "✅ cash_balance saved:",
        JSON.stringify(
          cashRes.rows[0]
        )
      );


      processedClients++;


      results.push({

        clientId,

        clientName,

        district:
          client.district,

        agentUid,

        commandId,

        success: true,

        lastClosingDate,

        lastClosingBalance,

        cashBalance:
          cashRes.rows[0]

      });

    }


    /* ========================================================
       16. FINAL RESPONSE
    ======================================================== */

    console.log("");
    console.log(
      "=============================================="
    );

    console.log(
      "✅ CHECK ONLINE STATUS FINISHED"
    );

    console.log(
      "Query ID:",
      queryId
    );

    console.log(
      "District:",
      district
    );

    console.log(
      "Online clients:",
      clientsRes.rows.length
    );

    console.log(
      "Commands created:",
      commandsCreated
    );

    console.log(
      "Processed:",
      processedClients
    );

    console.log(
      "Failed:",
      failedClients
    );

    console.log(
      "=============================================="
    );


    return NextResponse.json({

      success: true,

      queryId,

      district,

      date: todayStr,

      onlineClients:
        clientsRes.rows.length,

      commandsCreated,

      processedClients,

      failedClients,

      results

    });


  } catch (error: any) {

    console.error(
      "🔥 execute-online-status error:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          String(error)
      },
      {
        status: 500
      }
    );

  }

}