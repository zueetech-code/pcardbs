import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // ============================================================
    // 1. AUTHENTICATE
    // ============================================================

    const agent = await authenticateAgent(request);

    // ============================================================
    // 2. GET CONFIG
    // ============================================================

    const result = await pool.query(
      `
      SELECT
        client_id,
        email,
        host,
        port,
        username,
        password,
        database,
        created_at,
        updated_at
      FROM db_configs
      WHERE client_id = $1
      LIMIT 1
      `,
      [
        agent.clientId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "DB config not found",
        },
        {
          status: 404,
        }
      );
    }

    const config = result.rows[0];

    // ============================================================
    // 3. VALIDATE
    // ============================================================

    if (
      !config.host ||
      !config.port ||
      !config.database
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Incomplete DB configuration",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !config.username ||
      !config.password
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "DB credentials are missing",
        },
        {
          status: 500,
        }
      );
    }

    // ============================================================
    // 4. RETURN
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          username: config.username,
          password: config.password,
        },
      },
      {
        status: 200,
      }
    );

  } catch (error) {
    console.error(
      "Agent config API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to get DB config";

    if (
      message.toLowerCase().includes("token") ||
      message.toLowerCase().includes("authorization")
    ) {
      return NextResponse.json(
        {
          success: false,
          message,
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}