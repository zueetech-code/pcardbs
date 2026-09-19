import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import { pool } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // ============================================================
    // 1. AUTHENTICATE
    // ============================================================

    const agent = await authenticateAgent(request);

    // ============================================================
    // 2. QUERY ID
    // ============================================================

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Query ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // 3. FIND ASSIGNED QUERY
    // ============================================================

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        sql,
        assigned_agents,
        variables,
        created_at
      FROM queries
      WHERE id = $1
        AND $2 = ANY(assigned_agents)
      LIMIT 1
      `,
      [
        id,
        agent.agentUid,
      ]
    );

    // ============================================================
    // 4. NOT FOUND / NOT ASSIGNED
    // ============================================================

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Query not found or not assigned to this agent",
        },
        {
          status: 404,
        }
      );
    }

    const query = result.rows[0];

    // ============================================================
    // 5. RETURN
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        query: {
          id: query.id,
          name: query.name,
          sql: query.sql,
          assigned_agents:
            query.assigned_agents,
          variables: query.variables,
          created_at: query.created_at,
        },
      },
      {
        status: 200,
      }
    );

  } catch (error) {
    console.error(
      "Agent query API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to get query";

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