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

    const agent =
      await authenticateAgent(request);

    // ============================================================
    // 2. GET COMMAND ID
    // ============================================================

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Command ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // 3. ATOMICALLY CLAIM COMMAND
    // ============================================================
    //
    // Only a command with status='pending' can be claimed.
    //
    // If another agent already claimed it, this UPDATE returns
    // zero rows.
    //
    // Client ID comes from the authenticated token.
    //
    // We do NOT trust client_id supplied by the agent.
    //
    // ============================================================

    const result =
      await pool.query(
        `
        UPDATE commands
        SET
          status = 'running',
          started_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND client_id = $2
          AND status = 'pending'
        RETURNING
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
        `,
        [
          id,
          agent.clientId,
        ]
      );

    // ============================================================
    // 4. COMMAND ALREADY CLAIMED / NOT FOUND
    // ============================================================

    if (result.rows.length === 0) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Command is not available for claiming",
        },
        {
          status: 409,
        }
      );
    }

    // ============================================================
    // 5. SUCCESS
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        message: "Command claimed successfully",
        command: result.rows[0],
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "Command claim API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to claim command";

    // ============================================================
    // AUTH ERROR
    // ============================================================

    if (
      message.toLowerCase().includes(
        "token"
      ) ||
      message.toLowerCase().includes(
        "authorization"
      )
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

    // ============================================================
    // SERVER ERROR
    // ============================================================

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