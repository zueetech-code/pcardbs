export type HeartbeatStatus = "online" | "offline"

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export function resolveHeartbeatStatus(
  lastSeen?: string | Date | null
): HeartbeatStatus {

  if (!lastSeen) return "offline"

  const lastSeenTime = new Date(lastSeen).getTime()

  if (isNaN(lastSeenTime)) return "offline" // ✅ safety

  const now = Date.now()

  return now - lastSeenTime > OFFLINE_THRESHOLD_MS
    ? "offline"
    : "online"
}