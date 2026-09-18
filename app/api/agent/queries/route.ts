import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate agent
    const agent = await authenticateAgent(request);

    // 2. Get only queries assigned to this agent
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
      WHERE $1 = ANY(assigned_agents)
      ORDER BY created_at DESC
      `,
      [agent.agentUid]
    );

    // 3. Return only assigned queries
    return NextResponse.json(
      result.rows.map((query) => ({
        id: query.id,
        name: query.name,
        sql: query.sql,
        assigned_agents: query.assigned_agents,
        variables: query.variables || [],
        created_at: query.created_at,
      })),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Agent queries API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to get assigned queries";

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
