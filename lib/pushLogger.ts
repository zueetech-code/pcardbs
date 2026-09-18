import { pool } from "@/lib/db"

export async function logPushStatus({
  source,
  clientName,
  fromDate,
  module,
  response,
  status,
}: {
  source: "FIREBASE" | "Server"
  clientName: string
  fromDate: string
  module: string
  response: any
  status: "SUCCESS" | "FAILED" | "DRY_RUN"
}) {
  const client = await pool.connect()

  try {
    await client.query(
      `
      INSERT INTO push_logs (
        source,
        client_name,
        from_date,
        module,
        status,
        response,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (source, client_name, from_date, module)
      DO UPDATE SET
        status     = EXCLUDED.status,
        response   = EXCLUDED.response,
        created_at = NOW()
      `,
      [
        source,
        clientName,
        fromDate,
        module,
        status,
        response ? JSON.stringify(response) : null,
      ]
    )
  } finally {
    client.release()
  }
}