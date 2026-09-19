export type HeartbeatStatus = "online" | "offline";

const OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 seconds

export function resolveHeartbeatStatus(
  lastSeen?: string | Date | null
): HeartbeatStatus {

  if (!lastSeen) {
    return "offline";
  }

  const lastSeenTime =
    new Date(lastSeen).getTime();

  if (Number.isNaN(lastSeenTime)) {
    return "offline";
  }

  const now = Date.now();

  const elapsed = now - lastSeenTime;

  // Future timestamp = invalid heartbeat
  if (elapsed < 0) {
    return "offline";
  }

  // Older than 30 seconds = offline
  if (elapsed > OFFLINE_THRESHOLD_MS) {
    return "offline";
  }

  return "online";
}