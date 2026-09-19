import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {
  const result = await pool.query(`
    SELECT id, email, role, active
    FROM users
    ORDER BY created_at DESC
  `)

  return NextResponse.json(result.rows)
}

export async function POST(req: Request) {
  const { email, password, role } = await req.json()

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400 }
    )
  }

  await pool.query(
    `INSERT INTO users
      (email, password, role, active, created_at)
     VALUES
      ($1, crypt($2, gen_salt('bf')), $3, true, NOW())`,
    [email, password, role]
  )

  return NextResponse.json({ success: true })
}
