import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET(){

  const result = await pool.query(`
    SELECT id AS uid,email
    FROM users
    WHERE role='agent'
  `)

  return NextResponse.json(result.rows)
}