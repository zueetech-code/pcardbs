import { getFirestore, doc, onSnapshot } from "firebase/firestore"

const db = getFirestore()

export function subscribeLastSeen(
  clientId: string,
  onUpdate: (lastSeen: string | null) => void
) {
  const ref = doc(db, "agent_heartbeats", clientId)

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onUpdate(null)
      return
    }

    onUpdate(snap.data().lastSeen ?? null)
  })
}
