import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(req: Request) {

  const { date } = await req.json()

  if (!date) {
    return NextResponse.json(
      { error: "Date is required" },
      { status: 400 }
    )
  }

  const client = await pool.connect()

  try {

    const res = await client.query(
      `
      SELECT
        client_name,

        BOOL_OR(COALESCE(members_inserted, false)) AS members_inserted,
        BOOL_OR(COALESCE(deposits_inserted, false)) AS deposits_inserted,
        BOOL_OR(COALESCE(loans_inserted, false)) AS loans_inserted,
        BOOL_OR(COALESCE(jewel_inserted, false)) AS jewel_inserted,
        BOOL_OR(COALESCE(memberwise_inserted, false)) AS memberwise_inserted

      FROM report_insert_log

      WHERE report_date = $1

      GROUP BY client_name

      ORDER BY client_name
      `,
      [date]
    )

    const map: any = {}

    res.rows.forEach((row) => {

      map[row.client_name] = {
        member: row.members_inserted === true,
        deposit: row.deposits_inserted === true,
        loan: row.loans_inserted === true,
        jewel: row.jewel_inserted === true,
        memberwise: row.memberwise_inserted === true,
      }

    })

    console.log("📊 CHECK STATUS:", date, map)

    return NextResponse.json(map, {
      headers: {
        "Cache-Control": "no-store"
      }
    })

  } catch (err) {

    console.error("CHECK STATUS ERROR:", err)

    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    )

  } finally {
    client.release()
  }
}
