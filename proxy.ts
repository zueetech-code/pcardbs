import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

export function proxy(req: NextRequest) {

  const token = req.cookies.get("token")?.value
  //console.log("Proxy middleware - token:", token)
  //console.log("COOKIE:", req.cookies.get("token"))

  // protect admin routes
  if (req.nextUrl.pathname.startsWith("/admin")) {

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!)
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL("/login", req.url))
    }

  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"]
}