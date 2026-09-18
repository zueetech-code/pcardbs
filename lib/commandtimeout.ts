import { adminDb } from "@/lib/firebase-admin"

let started = false

export function startCommandTimeoutWorker() {

  if (started) return
  started = true

  console.log("Command timeout worker started")

  setInterval(async () => {

    try {

      const snap = await adminDb
        .collection("commands")
        .where("status", "==", "pending")
        .get()

      const now = Date.now()

      for (const doc of snap.docs) {

        const data: any = doc.data()

        if (!data.createdAt) continue

        const created = data.createdAt.toDate().getTime()

        const diffMinutes = (now - created) / (1000 * 60)

        if (diffMinutes > 20) {

          await doc.ref.update({
            status: "failed",
            error: "Timeout > 20 minutes",
            updatedAt: new Date()
          })

          console.log("Command timed out:", doc.id)

        }

      }

    } catch (err) {

      console.error("Timeout worker error:", err)

    }

  }, 60000) // every 1 minute

}