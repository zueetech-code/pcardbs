import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  let client;

  try {
    // ==================================================
    // 1. Read request body
    // ==================================================

    const body = await req.json();

    const agentId =
      typeof body.agentId === "string"
        ? body.agentId.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";


    // ==================================================
    // 2. Encryption key
    // ==================================================

    const encryptionKey =
      process.env.ENCRYPTION_SECRET;


    // ==================================================
    // 3. Validate input
    // ==================================================

    if (!agentId || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Agent ID and password are required",
        },
        { status: 400 }
      );
    }


    if (!encryptionKey) {
      console.error(
        "AGENT_ENCRYPTION_KEY is not configured"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Encryption key is not configured on server",
        },
        { status: 500 }
      );
    }


    // ==================================================
    // 4. PostgreSQL connection
    // ==================================================

    client = await pool.connect();


    // ==================================================
    // 5. Find active agent by email
    // ==================================================

    const userResult = await client.query(
      `
      SELECT
        id,
        email,
        role,
        client_id,
        active,
        password
      FROM users
      WHERE LOWER(email) = $1
        AND role = 'agent'
        AND active = true
      LIMIT 1
      `,
      [agentId]
    );


    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Agent not found",
        },
        { status: 401 }
      );
    }


    const user =
      userResult.rows[0];


    // ==================================================
    // 6. Verify password
    // ==================================================

    const passwordResult =
      await client.query(
        `
        SELECT crypt($1, $2) = $2 AS valid
        `,
        [
          password,
          user.password,
        ]
      );


    const passwordValid =
      passwordResult.rows[0]?.valid === true;


    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid password",
        },
        { status: 401 }
      );
    }


    // ==================================================
    // 7. Validate client ID
    // ==================================================

    if (!user.client_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent does not have a client ID",
        },
        { status: 500 }
      );
    }


    // ==================================================
    // 8. Generate token
    // ==================================================

    const token =
      crypto
        .randomBytes(32)
        .toString("hex");


    // ==================================================
    // 9. Hash token
    // ==================================================

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");


    // ==================================================
    // 10. Revoke previous token
    // ==================================================

    await client.query(
      `
      UPDATE agent_tokens
      SET
        active = false,
        revoked_at = NOW()
      WHERE agent_uid = $1
        AND active = true
      `,
      [user.id]
    );


    // ==================================================
    // 11. Store new token
    // ==================================================

    await client.query(
      `
      INSERT INTO agent_tokens (
        agent_uid,
        client_id,
        token_hash,
        active,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        true,
        NOW()
      )
      `,
      [
        user.id,
        user.client_id,
        tokenHash,
      ]
    );


    // ==================================================
    // 12. Return setup information
    // ==================================================

    return NextResponse.json({
      success: true,

      message:
        "Agent setup authentication successful",

      agent: {
        id: user.id,
        email: user.email,
        clientId: user.client_id,
        encryptionKey,
      },

      token,

      
    });


  } catch (error) {

    console.error(
      "Agent setup API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );


  } finally {

    if (client) {
      client.release();
    }

  }
}
