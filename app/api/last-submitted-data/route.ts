import { NextResponse } from "next/server";
import { pool } from "@/lib/db"; // Database connection

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
  id,
  client_name,
  sds_code,
  report_date::text AS report_date,
  branch_name,
  branch_inserted,
  members_inserted,
  deposits_inserted,
  loans_inserted,
  jewel_inserted,
  employee_inserted,
  npa_inserted,
  profit_inserted,
  safety_inserted,
  created_at,
  submission_type
FROM report_insert_log;
    `);
    //console.log("Last submitted data query result:", result.rows);

    if (!result.rows.length) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching last submitted data:", error);
    return NextResponse.json({ error: "Failed to fetch last submitted data" }, { status: 500 });
  } finally {
    client.release();
  }
}