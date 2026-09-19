import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { agentUid } = await req.json()

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // 1. Update client's assigned agent
    const clientResult = await client.query(
      `UPDATE clients
       SET agent_uid = $1
       WHERE client_id = $2
       RETURNING client_id, agent_uid`,
      [agentUid, id]
    )

    if (clientResult.rowCount === 0) {
      await client.query("ROLLBACK")

      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 }
      )
    }

    // 2. Get agent email using agent ID
    const agentResult = await client.query(
      `SELECT email
       FROM public.users
       WHERE id = $1
       LIMIT 1`,
      [agentUid]
    )

    if (agentResult.rowCount === 0) {
      await client.query("ROLLBACK")

      return NextResponse.json(
        { success: false, message: "Agent not found" },
        { status: 404 }
      )
    }

    const agentEmail = agentResult.rows[0].email

    // 3. Update client_id using the agent's email
    await client.query(
      `UPDATE public.users
       SET client_id = $1
       WHERE email = $2`,
      [id, agentEmail]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      clientId: id,
      agentUid,
      agentEmail,
    })
  } catch (error) {
    await client.query("ROLLBACK")

    console.error("Error assigning agent:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to assign agent",
      },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
