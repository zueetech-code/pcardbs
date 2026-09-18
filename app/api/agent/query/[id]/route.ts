import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import {pool} from "@/lib/db";

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
    // 1. AUTHENTICATE AGENT
    // ============================================================

    const agent =
      await authenticateAgent(request);

    // ============================================================
    // 2. GET QUERY ID
    // ============================================================

    const { id } =
      await context.params;

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
    // 3. FIND QUERY ASSIGNED TO THIS AGENT
    // ============================================================
    //
    // assigned_agents is TEXT[]
    //
    // We check:
    //
    // agent.agentUid = ANY(assigned_agents)
    //
    // This prevents one agent from retrieving another agent's
    // query.
    //
    // ============================================================

    const result =
      await pool.query(
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
        LIMIT 1
        `,
        [
          id
        ]
      );

    // ============================================================
    // 4. QUERY NOT FOUND
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

    const query =
      result.rows[0];

    // ============================================================
    // 5. RETURN QUERY
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        query: {
          id:
            query.id,

          name:
            query.name,

          sql:
            query.sql,

          assigned_agents:
            query.assigned_agents,

          variables:
            query.variables,

          created_at:
            query.created_at,
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