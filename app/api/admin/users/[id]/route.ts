import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: result.rowCount
    })
  } catch (err: any) {
    console.error(err)

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}