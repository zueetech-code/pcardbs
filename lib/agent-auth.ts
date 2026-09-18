import crypto from "crypto";
import { NextRequest } from "next/server";
import {pool}  from "@/lib/db";

export interface AuthenticatedAgent {
  agentUid: string;
  clientId: string;
  email: string;
}

export async function authenticateAgent(
  request: NextRequest
): Promise<AuthenticatedAgent> {

  // --------------------------------------------------
  // 1. Read Authorization header
  // --------------------------------------------------

  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    throw new Error("Missing authorization header");
  }

  // --------------------------------------------------
  // 2. Check Bearer token
  // --------------------------------------------------

  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Invalid authorization format");
  }

  const token =
    authorization.substring(7).trim();

  if (!token) {
    throw new Error("Missing agent token");
  }

  // --------------------------------------------------
  // 3. Hash supplied token
  // --------------------------------------------------

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // --------------------------------------------------
  // 4. Find active token
  // --------------------------------------------------

  const result = await pool.query(
    `
    SELECT
      at.agent_uid,
      at.client_id,
      u.email
    FROM agent_tokens at
    INNER JOIN users u
      ON u.id = at.agent_uid
    WHERE at.token_hash = $1
      AND at.active = true
      AND u.active = true
      AND u.role = 'agent'
    LIMIT 1
    `,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or revoked agent token");
  }

  const agent = result.rows[0];

  // --------------------------------------------------
  // 5. Update last_used_at
  // --------------------------------------------------

  await pool.query(
    `
    UPDATE agent_tokens
    SET last_used_at = NOW()
    WHERE token_hash = $1
    `,
    [tokenHash]
  );

  // --------------------------------------------------
  // 6. Return authenticated agent
  // --------------------------------------------------

  return {
    agentUid: agent.agent_uid,
    clientId: agent.client_id,
    email: agent.email,
  };
}