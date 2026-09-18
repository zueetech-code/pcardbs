import { NextResponse } from "next/server";
import { pool } from "@/lib/db"

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS server_time,
        current_database() AS database_name,
        current_user AS database_user
    `);

    return NextResponse.json({
      success: true,
      message: "Central PostgreSQL connection successful",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Central PostgreSQL connection failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}