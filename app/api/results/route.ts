import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const commandId = searchParams.get("commandId");

    if (!commandId) {
      return NextResponse.json(
        {
          success: false,
          error: "Command ID is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        row_data
      FROM query_results
      WHERE command_id = $1
      ORDER BY row_index
      `,
      [commandId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json([]);
    }

    // ============================================================
    // row_data format:
    //
    // {
    //   rows: [
    //     {
    //       branchstatus: "O",
    //       calendardate: "2026-03-10"
    //     }
    //   ],
    //   columns: [
    //     "calendardate",
    //     "branchstatus"
    //   ],
    //   rowCount: 1
    // }
    //
    // Frontend needs ONLY:
    //
    // [
    //   {
    //     branchstatus: "O",
    //     calendardate: "2026-03-10"
    //   }
    // ]
    // ============================================================

    const allRows: any[] = [];

    for (const record of result.rows) {
      const rowData = record.row_data;

      if (
        rowData &&
        Array.isArray(rowData.rows)
      ) {
        allRows.push(...rowData.rows);
      }
    }

    return NextResponse.json(allRows);

  } catch (error) {
    console.error(
      "Get query results error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get results",
      },
      { status: 500 }
    );
  }
}


// ============================================================
// DELETE RESULTS
// ============================================================

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const commandId = searchParams.get("commandId");

    if (!commandId) {
      return NextResponse.json(
        {
          success: false,
          error: "Command ID is required",
        },
        { status: 400 }
      );
    }

    await pool.query(
      `
      DELETE FROM query_results
      WHERE command_id = $1
      `,
      [commandId]
    );

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error(
      "Delete query results error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete results",
      },
      { status: 500 }
    );
  }
}
