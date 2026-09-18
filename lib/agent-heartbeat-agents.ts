"use client"

import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase-client"

/**
 * Realtime ONLY — no initial attach
 */
export function subscribeAgentHeartbeat(
  agentUid: string,
  onUpdate: (lastSeen: string | null) => void
) {
  const q = query(
    collection(db, "agent_heartbeats"),
    where("agentUid", "==", agentUid)
  )

  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      onUpdate(null)
      return
    }

    onUpdate(snap.docs[0].data().lastSeen ?? null)
  })
}
