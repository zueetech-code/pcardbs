import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

export async function GET() {
  try {

    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ role: "guest" })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as any

    return NextResponse.json({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    })

  } catch (err) {

    return NextResponse.json({
      role: "guest"
    })

  }
}