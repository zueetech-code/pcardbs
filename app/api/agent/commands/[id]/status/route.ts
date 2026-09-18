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
    // 3. READ BODY
    // ============================================================

    let body: any = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // ============================================================
    // 4. VALIDATE STATUS
    // ============================================================

    const status =
      typeof body.status === "string"
        ? body.status.trim().toLowerCase()
        : "";

    if (
      status !== "success" &&
      status !== "failed"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status must be 'success' or 'failed'",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // 5. RESULT / ERROR MESSAGE
    // ============================================================

    const message =
      typeof body.result === "string"
        ? body.result.trim()
        : "";

    // ============================================================
    // 6. FIND COMMAND
    // ============================================================

    const commandResult =
      await pool.query(
        `
        SELECT
          id,
          client_id,
          agent_uid,
          status
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

    if (
      commandResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Command not found",
        },
        {
          status: 404,
        }
      );
    }

    const command =
      commandResult.rows[0];

    // ============================================================
    // 7. VERIFY AGENT
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
        {
          status: 403,
        }
      );
    }

    // ============================================================
    // 8. PREVENT INVALID STATE TRANSITION
    // ============================================================

    if (
      command.status !== "running"
    ) {

      // Already finalized
      if (
        command.status === "success" ||
        command.status === "failed"
      ) {
        return NextResponse.json(
          {
            success: true,
            message:
              "Command already finalized",
            status:
              command.status,
          },
          {
            status: 200,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            `Command cannot be finalized from status '${command.status}'`,
        },
        {
          status: 409,
        }
      );
    }

    // ============================================================
    // 9. UPDATE COMMAND
    // ============================================================

    let updated;

    if (status === "success") {

      updated =
        await pool.query(
          `
          UPDATE commands
          SET
            status = 'success',
            result = $2,
            error = NULL,
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
            AND client_id = $3
            AND status = 'running'
          RETURNING
            id,
            client_id,
            agent_uid,
            query_id,
            status,
            result,
            error,
            created_at,
            updated_at,
            started_at,
            completed_at
          `,
          [
            id,
            message ||
              "Command completed successfully",
            agent.clientId,
          ]
        );

    } else {

      updated =
        await pool.query(
          `
          UPDATE commands
          SET
            status = 'failed',
            result = $2,
            error = $2,
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
            AND client_id = $3
            AND status = 'running'
          RETURNING
            id,
            client_id,
            agent_uid,
            query_id,
            status,
            result,
            error,
            created_at,
            updated_at,
            started_at,
            completed_at
          `,
          [
            id,
            message ||
              "Command execution failed",
            agent.clientId,
          ]
        );
    }

    // ============================================================
    // 10. RACE CONDITION PROTECTION
    // ============================================================

    if (
      updated.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Command status could not be updated",
        },
        {
          status: 409,
        }
      );
    }

    // ============================================================
    // 11. SUCCESS
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Command status updated successfully",

        command:
          updated.rows[0],
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "Agent command status API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update command status";

    // ============================================================
    // AUTH ERROR
    // ============================================================

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