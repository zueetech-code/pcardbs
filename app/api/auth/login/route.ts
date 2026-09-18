import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      )
    }

    // find user
    const result = await pool.query(
      `SELECT id,email,password,role,active
       FROM users
       WHERE email=$1`,
      [email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const user = result.rows[0]

    if (!user.active) {
      return NextResponse.json(
        { error: "User account disabled" },
        { status: 403 }
      )
    }

    // check password
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // create jwt
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "8h"
      }
    )

    // set cookie
    ;(await
          // set cookie
          cookies()).set("token", token, {
      httpOnly: true,
      secure: false, // change to true in production
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8
    })

    return NextResponse.json({
      success: true,
      role: user.role
    })

  } catch (err) {

    console.error("LOGIN ERROR:", err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )

  }
}