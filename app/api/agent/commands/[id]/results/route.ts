import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import {pool} from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // ============================================================
    // 1. AUTHENTICATE AGENT
    // ============================================================

    const agent = await authenticateAgent(request);

    // ============================================================
    // 2. COMMAND ID
    // ============================================================

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Command ID is required",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 3. READ BODY
    // ============================================================

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 4. VALIDATE QUERY TYPE
    // ============================================================

    const queryType =
      typeof body.queryType === "string"
        ? body.queryType.toUpperCase()
        : "SELECT";

    if (
      queryType !== "SELECT" &&
      queryType !== "UPDATE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only SELECT and UPDATE are supported",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 5. GET COMMAND
    // ============================================================

    const commandResult = await pool.query(
      `
      SELECT
        id,
        client_id,
        agent_uid,
        query_id,
        sql,
        variables,
        status,
        started_at
      FROM commands
      WHERE id = $1
        AND client_id = $2
      LIMIT 1
      `,
      [
        id,
        agent.clientId,
      ]
    );

    if (commandResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Command not found",
        },
        { status: 404 }
      );
    }

    const command = commandResult.rows[0];

    // ============================================================
    // 6. VERIFY AGENT
    // ============================================================

    if (
      command.agent_uid &&
      command.agent_uid !== agent.agentUid
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Command does not belong to this agent",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // 7. COMMAND MUST BE RUNNING
    // ============================================================

    if (command.status !== "running") {
      return NextResponse.json(
        {
          success: false,
          message:
            `Command is not running. Current status: ${command.status}`,
        },
        { status: 409 }
      );
    }

    // ============================================================
    // 8. PREVENT DUPLICATE RESULT
    // ============================================================

    const existingResult = await pool.query(
      `
      SELECT id
      FROM query_results
      WHERE command_id = $1
      LIMIT 1
      `,
      [
        String(id),
      ]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Result already stored for this command",
        },
        { status: 409 }
      );
    }

    // ============================================================
    // 9. GET RESULT DATA
    // ============================================================

    const tableName =
      typeof body.tableName === "string"
        ? body.tableName
        : null;

    const columns: string[] =
      Array.isArray(body.columns)
        ? body.columns.map(
            (value: unknown) =>
              String(value)
          )
        : [];

    const rows: any[] =
      Array.isArray(body.rows)
        ? body.rows
        : [];

    const rowCount =
      typeof body.rowCount === "number"
        ? body.rowCount
        : rows.length;

    // ============================================================
    // 10. BUILD COMPLETE JSON RESULT
    // ============================================================
    //
    // ONE QUERY
    //     ↓
    // ONE query_results ROW
    //     ↓
    // row_data = complete JSON
    //
    // ============================================================

    const completeResult = {
      columns,
      rowCount,
      rows,
    };

    // ============================================================
    // 11. EXPIRATION
    // ============================================================

    const expiresAt = new Date(
      Date.now() +
      24 * 60 * 60 * 1000
    );

    // ============================================================
    // 12. INSERT ONE ROW
    // ============================================================

    const inserted = await pool.query(
      `
      INSERT INTO query_results (
        command_id,
        agent_uid,
        table_name,
        query_type,
        row_count,
        column_order,
        columns,
        row_index,
        row_data,
        stored_by,
        created_at,
        expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::jsonb,
        $10,
        NOW(),
        $11
      )
      RETURNING
        id,
        command_id,
        agent_uid,
        table_name,
        query_type,
        row_count,
        column_order,
        columns,
        row_index,
        row_data,
        stored_by,
        created_at,
        expires_at
      `,
      [
        String(id),

        agent.agentUid,

        tableName,

        queryType,

        rowCount,

        columns,

        columns,

        0,

        JSON.stringify(completeResult),

        "agent",

        expiresAt,
      ]
    );

    // ============================================================
    // 13. SUCCESS
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Complete query result stored successfully",

        commandId:
          String(id),

        queryType,

        rowCount,

        storedRows: 1,

        result:
          inserted.rows[0],
      },
      { status: 200 }
    );

  } catch (error) {

    console.error(
      "Agent result API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to store query result";

    if (
      message
        .toLowerCase()
        .includes("token") ||
      message
        .toLowerCase()
        .includes("authorization")
    ) {
      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}