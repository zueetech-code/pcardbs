import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import {pool} from "@/lib/db";

export async function GET(
  request: NextRequest
) {
  try {
    // ============================================================
    // 1. AUTHENTICATE AGENT
    // ============================================================

    const agent =
      await authenticateAgent(request);

    // ============================================================
    // 2. GET PENDING COMMANDS
    // ============================================================
    //
    // IMPORTANT:
    //
    // We use client_id from the authenticated token.
    //
    // We DO NOT accept client_id from the request.
    //
    // This prevents:
    //
    // Agent A → requesting Client B commands
    //
    // ============================================================

    const result =
      await pool.query(
        `
        SELECT
          id,
          client_id,
          agent_uid,
          sql,
          query_id,
          variables,
          status,
          created_at,
          updated_at,
          started_at,
          completed_at,
          result
        FROM commands
        WHERE client_id = $1
          AND status = 'pending'
        ORDER BY created_at ASC
        LIMIT 20
        `,
        [
          agent.clientId
        ]
      );

    // ============================================================
    // 3. RETURN COMMANDS
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        commands:
          result.rows
      },
      {
        status: 200
      }
    );

  } catch (error) {

    console.error(
      "Agent commands API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to get commands";

    // Authentication errors
    if (
      message.includes(
        "authorization"
      ) ||
      message.includes(
        "token"
      )
    ) {

      return NextResponse.json(
        {
          success: false,
          message
        },
        {
          status: 401
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message
      },
      {
        status: 500
      }
    );
  }
}