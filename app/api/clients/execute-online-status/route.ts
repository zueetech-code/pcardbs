import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const COMMAND_TIMEOUT = 120000; // 2 minutes
const POLL_INTERVAL = 2000; // 2 seconds

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
   EXTRACT LAST CLOSING DATA
============================================================ */

function extractClosingData(rowData: any) {
  let row = rowData;

  // Handle JSON stored as string
  if (typeof row === "string") {
    try {
      row = JSON.parse(row);
    } catch {
      return {
        lastClosingDate: null,
        lastClosingBalance: null,
      };
    }
  }

  /*
    Your query_results currently stores:

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

  let actualRow: any = null;

  if (Array.isArray(row?.rows) && row.rows.length > 0) {
    actualRow = row.rows[0];
  } else if (row?.lastdate || row?.closingbalance) {
    actualRow = row;
  }

  if (!actualRow) {
    return {
      lastClosingDate: null,
      lastClosingBalance: null,
    };
  }

  const lastClosingDate =
    actualRow.lastdate ??
    actualRow.last_date ??
    actualRow.lastDate ??
    null;

  let lastClosingBalance =
    actualRow.closingbalance ??
    actualRow.closing_balance ??
    actualRow.closingBalance ??
    null;

  if (typeof lastClosingBalance === "string") {
    lastClosingBalance =
      parseFloat(
        lastClosingBalance.replace(/[^0-9.-]+/g, "")
      ) || 0;
  }

  return {
    lastClosingDate,
    lastClosingBalance,
  };
}

/* ============================================================
   INSERT CASH BALANCE
============================================================ */

async function insertCashBalance(
  command: any
) {
  const {
    id: commandId,
    client_id: clientId,
    query_id: queryId,
  } = command;

  /* ==========================================================
     GET CLIENT DETAILS
  ========================================================== */

  const clientRes = await pool.query(
    `
    SELECT
      c.client_id,
      c.name,
      c.district,
      u.email
    FROM clients c
    LEFT JOIN users u
      ON c.agent_uid = u.id::text
    WHERE c.client_id = $1
    LIMIT 1
    `,
    [clientId]
  );

  if (clientRes.rows.length === 0) {
    console.log(
      "⚠️ Client not found:",
      clientId
    );

    return {
      success: false,
      error: "Client not found",
    };
  }

  const client = clientRes.rows[0];

  /* ==========================================================
     GET QUERY RESULT
  ========================================================== */

  const resultRes = await pool.query(
    `
    SELECT
      row_data
    FROM query_results
    WHERE command_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [commandId]
  );

  if (resultRes.rows.length === 0) {
    console.log(
      "⚠️ Query result not found:",
      commandId
    );

    return {
      success: false,
      error: "Query result not found",
    };
  }

  const {
    lastClosingDate,
    lastClosingBalance,
  } = extractClosingData(
    resultRes.rows[0].row_data
  );

  // console.log(
  //   "📦 Result:",
  //   client.name,
  //   lastClosingDate,
  //   lastClosingBalance
  // );

  /* ==========================================================
     VALIDATE RESULT
  ========================================================== */

  if (!lastClosingDate) {
    console.log(
      "⚠️ No closing date:",
      client.name
    );

    return {
      success: false,
      error: "lastdate missing",
    };
  }

  /* ==========================================================
     INSERT / UPSERT CASH BALANCE
  ========================================================== */

  await pool.query(
    `
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
      (client_name, last_closing_date)

    DO UPDATE SET

      client_id =
        EXCLUDED.client_id,

      last_closing_balance =
        EXCLUDED.last_closing_balance,

      district =
        EXCLUDED.district,

      email =
        EXCLUDED.email,

      updated_at =
        NOW()
    `,
    [
      client.client_id,
      client.name,
      client.district,
      client.email,
      lastClosingBalance,
      lastClosingDate,
    ]
  );

  console.log(
    "💰 CASH BALANCE UPDATED:",
    client.name
  );

  return {
    success: true,
    commandId,
    clientId,
    clientName: client.name,
    district: client.district,
    lastClosingDate,
    lastClosingBalance,
  };
}

/* ============================================================
   POST
============================================================ */

export async function POST(
  request: NextRequest
) {
  try {
    console.log("");
    console.log(
      "================================================"
    );
    console.log(
      "🚀 CHECK ONLINE STATUS"
    );
    console.log(
      "================================================"
    );

    /* ========================================================
       1. READ REQUEST
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
          error: "queryId is required",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "🔎 Query ID:",
      queryId
    );

    console.log(
      "📍 District:",
      district
    );

    const todayStr =
      getTodayString();

    /* ========================================================
       2. FIND ONLINE CLIENTS

       ONLY:
       - heartbeat status online
       - last_seen <= 1 minute
       - selected district
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

    if (clientsRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        queryId,
        district,
        date: todayStr,
        onlineClients: 0,
        commandsCreated: 0,
        completed: 0,
        failed: 0,
        message:
          district.toUpperCase() === "ALL"
            ? "No online clients"
            : `No online clients in ${district}`,
      });
    }

    /* ========================================================
       3. CREATE ALL COMMANDS IN PARALLEL

       IMPORTANT:
       NO await inside client loop.
    ======================================================== */

    console.log(
      "🚀 Creating commands in parallel..."
    );

    const commandPromises =
      clientsRes.rows.map(
        async (client) => {

          if (!client.agent_uid) {
            return {
              success: false,
              clientId: client.client_id,
              clientName: client.name,
              error: "agent_uid missing",
            };
          }

          try {

            const commandRes =
              await pool.query(
                `
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

                RETURNING
                  id,
                  client_id,
                  agent_uid,
                  query_id,
                  status
                `,
                [
                  client.client_id,
                  client.agent_uid,
                  queryId,
                  JSON.stringify({
                    Fromdate: todayStr,
                  }),
                ]
              );

            const command =
              commandRes.rows[0];

            console.log(
              "✅ Command created:",
              command.id,
              "→",
              client.name
            );

            return {
              success: true,
              ...command,
              clientName: client.name,
              district: client.district,
            };

          } catch (error: any) {

            console.error(
              "❌ Command creation failed:",
              client.client_id,
              error
            );

            return {
              success: false,
              clientId: client.client_id,
              clientName: client.name,
              error:
                error?.message ||
                "Command creation failed",
            };
          }
        }
      );

    /*
      ALL INSERTS RUN TOGETHER
    */

    const createdCommands =
      await Promise.all(
        commandPromises
      );

    const commands =
      createdCommands.filter(
        (x) => x.success
      );

    console.log(
      "✅ Commands created:",
      commands.length
    );

    /* ========================================================
       4. MONITOR ALL COMMANDS

       We don't wait for command A before checking B.

       Every poll checks ALL commands together.
    ======================================================== */

    const commandIds =
      commands.map(
        (command) =>
          command.id
      );

    const completedCommands =
      new Set<string>();

    const cashResults: any[] = [];

    const startTime =
      Date.now();

    console.log(
      "👀 Monitoring commands..."
    );

    while (
      completedCommands.size <
        commandIds.length &&
      Date.now() - startTime <
        COMMAND_TIMEOUT
    ) {

      /* ======================================================
         GET ALL FINISHED COMMANDS
      ====================================================== */

      const statusRes =
        await pool.query(
          `
          SELECT
            id,
            client_id,
            agent_uid,
            query_id,
            status,
            result,
            error,
            completed_at
          FROM commands
          WHERE id = ANY($1)
          `,
          [commandIds]
        );

      /* ======================================================
         PROCESS EVERY NEW SUCCESS / FAILED COMMAND

         These run in parallel.
      ====================================================== */

      const newlyFinished =
        statusRes.rows.filter(
          (command) =>
            (
              command.status ===
                "success" ||
              command.status ===
                "failed"
            ) &&
            !completedCommands.has(
              String(command.id)
            )
        );

      if (
        newlyFinished.length > 0
      ) {

        console.log(
          "📥 Newly finished:",
          newlyFinished.length
        );

        /*
          Process all newly completed
          commands in parallel.
        */

        const processing =
          newlyFinished.map(
            async (command) => {

              const commandId =
                String(command.id);

              /*
                Mark first so it cannot be
                processed twice during this
                request.
              */

              completedCommands.add(
                commandId
              );

              /* ============================================
                 SUCCESS
              ============================================ */

              if (
                command.status ===
                "success"
              ) {

                try {

                  const cash =
                    await insertCashBalance(
                      command
                    );

                  cashResults.push(
                    cash
                  );

                } catch (
                  error: any
                ) {

                  console.error(
                    "🔥 Cash balance insert failed:",
                    commandId,
                    error
                  );

                  cashResults.push({
                    success: false,
                    commandId,
                    clientId:
                      command.client_id,
                    error:
                      error?.message ||
                      String(error),
                  });
                }

              } else {

                /* ==========================================
                   FAILED COMMAND
                ========================================== */

                console.log(
                  "❌ Command failed:",
                  commandId,
                  command.error
                );

                cashResults.push({
                  success: false,
                  commandId,
                  clientId:
                    command.client_id,
                  error:
                    command.error ||
                    command.result ||
                    "Command failed",
                });
              }
            }
          );

        await Promise.all(
          processing
        );
      }

      /* ======================================================
         ALL FINISHED
      ====================================================== */

      if (
        completedCommands.size ===
        commandIds.length
      ) {
        console.log(
          "🎉 ALL COMMANDS FINISHED"
        );

        break;
      }

      /* ======================================================
         WAIT BEFORE NEXT GLOBAL POLL

         NOT waiting for individual command.
      ====================================================== */

      await sleep(
        POLL_INTERVAL
      );
    }

    /* ========================================================
       5. TIMEOUT INFORMATION
    ======================================================== */

    const pendingCommandIds =
      commandIds.filter(
        (id) =>
          !completedCommands.has(
            String(id)
          )
      );

    /* ========================================================
       6. FINAL RESPONSE
    ======================================================== */

    const successful =
      cashResults.filter(
        (x) => x.success
      );

    const failed =
      cashResults.filter(
        (x) => !x.success
      );

    console.log("");
    console.log(
      "================================================"
    );
    console.log(
      "🏁 CHECK ONLINE STATUS FINISHED"
    );
    console.log(
      "Commands:",
      commands.length
    );
    console.log(
      "Cash inserted:",
      successful.length
    );
    console.log(
      "Failed:",
      failed.length
    );
    console.log(
      "Still pending:",
      pendingCommandIds.length
    );
    console.log(
      "================================================"
    );

    return NextResponse.json({
      success: true,

      queryId,

      district,

      date: todayStr,

      onlineClients:
        clientsRes.rows.length,

      commandsCreated:
        commands.length,

      completed:
        completedCommands.size,

      cashBalanceInserted:
        successful.length,

      failed:
        failed.length,

      pending:
        pendingCommandIds.length,

      pendingCommandIds,

      results:
        cashResults,

      message:
        pendingCommandIds.length > 0
          ? "Some commands are still running"
          : "All commands completed and cash_balance updated",
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
          String(error),
      },
      {
        status: 500,
      }
    );
  }
}