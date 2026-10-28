/** Default off. Set SESSION_IDLE_TIMEOUT_MINUTES to enable idle logout. */
export const IDLE_TIMEOUT_MINUTES = 0;
export const IDLE_TIMEOUT_SECONDS = IDLE_TIMEOUT_MINUTES * 60;

export const isIdleTimeoutExceeded = (
  lastActivityUnixSeconds,
  nowUnixSeconds = Math.floor(Date.now() / 1000),
  limitSeconds = IDLE_TIMEOUT_SECONDS
) => {
  const limit = Number(limitSeconds);
  if (!Number.isFinite(limit) || limit <= 0) {
    return false;
  }
  if (!lastActivityUnixSeconds) {
    return true;
  }

  return nowUnixSeconds - Number(lastActivityUnixSeconds) > limit;
};
