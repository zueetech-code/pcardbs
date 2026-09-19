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

    // ============================================================
    // 1. FIND SDS CODE
    // ============================================================

    const reportResult = await client.query(
      `
      SELECT sds_code
      FROM report_insert_log
      WHERE client_name = $1
        AND report_date = $2
      LIMIT 1
      `,
      [clientName, date]
    );

    const sdsCode = reportResult.rows[0]?.sds_code;

    // ============================================================
    // 2. DELETE REPORT DATA
    // ============================================================

    let deletedReportData = false;

    if (sdsCode) {
      deletedReportData = true;

      // MEMBERS
      await client.query(
        `
        DELETE FROM members
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // DEPOSITS
      await client.query(
        `
        DELETE FROM deposits
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // LOANS
      await client.query(
        `
        DELETE FROM loans
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // JEWEL
      await client.query(
        `
        DELETE FROM jewel_details
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // EMPLOYEE
      await client.query(
        `
        DELETE FROM employee_details
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // NPA
      await client.query(
        `
        DELETE FROM npa_details
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // PROFIT
      await client.query(
        `
        DELETE FROM profit_details
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // SAFETY
      await client.query(
        `
        DELETE FROM safety_details
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // MEMBERWISE
      await client.query(
        `
        DELETE FROM deposit_loan_details_memberwise
        WHERE sds_code = $1
          AND date = $2
        `,
        [sdsCode, date]
      );

      // ==========================================================
      // 3. DELETE REPORT INSERT LOG
      // ==========================================================

      await client.query(
        `
        DELETE FROM report_insert_log
        WHERE sds_code = $1
          AND report_date = $2
        `,
        [sdsCode, date]
      );
    }

    // ============================================================
    // 4. DELETE PUSH LOG
    // ============================================================

    const pushResult = await client.query(
      `
      DELETE FROM pcardb_push_logs
      WHERE client_name = $1
        AND from_date::date = $2
      `,
      [clientName, date]
    );

    // ============================================================
    // 5. COMMIT EVERYTHING
    // ============================================================

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      clientName,
      date,
      sdsCode: sdsCode || null,

      deletedReportData,
      deletedPushLogRows: pushResult.rowCount ?? 0,

      message: "Client data deleted successfully",
    });

  } catch (err: any) {
    await client.query("ROLLBACK");

    console.error(
      "Delete local database error:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Delete failed",
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}
