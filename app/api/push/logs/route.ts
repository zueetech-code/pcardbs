import { NextResponse } from "next/server";
import { pool } from "@/lib/db"; // Database connection
import { logPushStatus } from "@/lib/pushLogger"

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
  client_name,
  from_date::date::text AS report_date,   -- 🔥 FIX
  module,
  status,
  created_at
FROM push_logs
ORDER BY created_at DESC;
    `);
    //console.log("Push logs query result:", result.rows);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching push logs:", error);
    return NextResponse.json({ error: "Failed to fetch push logs" }, { status: 500 });
  } finally {
    client.release();
  }
}