import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import {pool} from "@/lib/db";

export async function POST(
  request: NextRequest
) {
  try {
    // ============================================================
    // 1. AUTHENTICATE AGENT
    // ============================================================

    const agent =
      await authenticateAgent(request);

    // ============================================================
    // 2. READ REQUEST BODY
    // ============================================================

    let body: any = {};

    try {
      body = await request.json();
    } catch {
      // Empty body is allowed.
      body = {};
    }

    // ============================================================
    // 3. AGENT VERSION
    // ============================================================
    //
    // Do not trust agent_uid, client_id or email from the request.
    //
    // Those come from the authenticated token.
    //
    // Only agentVersion/status are accepted from the body.
    //
    // ============================================================

    const agentVersion =
      typeof body.agentVersion === "string" &&
      body.agentVersion.trim()
        ? body.agentVersion.trim()
        : "unknown";

    const status =
      typeof body.status === "string" &&
      body.status.trim()
        ? body.status.trim()
        : "online";

    // ============================================================
    // 4. VALIDATE STATUS
    // ============================================================

    const allowedStatuses = [
      "online",
      "offline",
      "busy",
    ];

    if (
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid agent status",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // 5. UPSERT HEARTBEAT
    // ============================================================
    //
    // Your table currently contains:
    //
    // client_id
    // agent_uid
    // agent_email
    // agent_version
    // status
    // last_seen
    //
    // We use client_id as the conflict key.
    //
    // ============================================================

    const result =
      await pool.query(
        `
        INSERT INTO agent_heartbeats (
          client_id,
          agent_uid,
          agent_email,
          agent_version,
          status,
          last_seen
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW()
        )
        ON CONFLICT (client_id)
        DO UPDATE SET
          agent_uid = EXCLUDED.agent_uid,
          agent_email = EXCLUDED.agent_email,
          agent_version = EXCLUDED.agent_version,
          status = EXCLUDED.status,
          last_seen = NOW()
        RETURNING
          client_id,
          agent_uid,
          agent_email,
          agent_version,
          status,
          last_seen
        `,
        [
          agent.clientId,
          agent.agentUid,
          agent.email,
          agentVersion,
          status,
        ]
      );

    // ============================================================
    // 6. RETURN SUCCESS
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        message: "Heartbeat received",
        heartbeat: result.rows[0],
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "Agent heartbeat API error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Heartbeat failed";

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