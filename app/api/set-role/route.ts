import { NextResponse } from "next/server"
import admin from "firebase-admin"

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
    ),
  })
}

export async function POST(req: Request) {
  try {
    const { uid, role } = await req.json()

    await admin.auth().setCustomUserClaims(uid, { role })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
