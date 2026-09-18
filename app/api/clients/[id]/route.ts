import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { name, status } = await req.json()

  await pool.query(
    `UPDATE clients SET name=$1, status=$2 WHERE id=$3`,
    [name, status, params.id]
  )

  return NextResponse.json({ success: true })
}
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const result = await pool.query(
      `DELETE FROM clients WHERE client_id = $1`,
      [id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Client not found" },
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