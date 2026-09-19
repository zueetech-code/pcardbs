import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const { clientName, date } = await req.json();

  if (!clientName || !date) {
    return NextResponse.json(
      {
        success: false,
        message: "clientName and date are required",
      },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      DELETE FROM pcardb_push_logs
      WHERE client_name = $1
      AND from_date::date = $2
      `,
      [clientName, date]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      deletedRows: result.rowCount ?? 0,
      message: "Local database data deleted successfully",
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Delete local database error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Delete failed",
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}