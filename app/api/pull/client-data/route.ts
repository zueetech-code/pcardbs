import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: Request) {

  /* ================= API KEY CHECK ================= */
  const apiKey = req.headers.get("x-api-key")

  if (apiKey !== process.env.PULL_API_KEY) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await req.json()

  /* ================= SUPPORT SINGLE OR MULTIPLE ================= */

  let clientIds: string[] = []
  const fromDate: string | undefined = body.fromDate

  if (body.clientIds && Array.isArray(body.clientIds)) {
    clientIds = body.clientIds
  } else if (body.clientId && typeof body.clientId === "string") {
    clientIds = [body.clientId]
  } else {
    return NextResponse.json(
      { error: "clientId or clientIds array is required" },
      { status: 400 }
    )
  }

  /* ================= PROCESS ALL CLIENTS IN PARALLEL ================= */

  const promises = clientIds.map(async (clientId) => {
    try {

      let docRef

      // If fromDate provided → deterministic ID
      if (fromDate) {
        const docId = `${clientId}_${fromDate}`
        docRef = adminDb.collection("final_reports").doc(docId)
      } else {
        // If no date → fetch latest report
        const snap = await adminDb
          .collection("final_reports")
          .where("clientId", "==", clientId)
          .orderBy("updatedAt", "desc")
          .limit(1)
          .get()

        if (snap.empty) {
          return { clientId, error: "No report found" }
        }

        return { clientId, data: snap.docs[0].data() }
      }

      const docSnap = await docRef.get()

      if (!docSnap.exists) {
        return { clientId, error: "Report not found" }
      }

      return { clientId, data: docSnap.data() }

    } catch (error) {
      console.error(error)
      return { clientId, error: "Internal server error" }
    }
  })

  const resultsArray = await Promise.all(promises)

  /* ================= FORMAT RESPONSE ================= */

  const results = resultsArray.reduce((acc, item) => {
    acc[item.clientId] = item.error
      ? { error: item.error }
      : { data: item.data }
    return acc
  }, {} as Record<string, any>)

  return NextResponse.json(results)
}
