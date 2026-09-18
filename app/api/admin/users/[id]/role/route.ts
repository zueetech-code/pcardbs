import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {

 try {
 const { id } = await params
  const { role } = await req.json()

  await pool.query(`
    UPDATE users
    SET role=$1
    WHERE id=$2
  `, [role, id])
 } catch (err) {
  console.error(err)
  return NextResponse.json({ success: false }, { status: 500 })
 }

  return NextResponse.json({ success: true })
}