export const IDLE_TIMEOUT_MINUTES = 0;
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;
export const SESSION_IDLE_CODES = ['SESSION_IDLE_TIMEOUT', 'TOKEN_EXPIRED'];

export const isIdleTimeoutEnabled = () => IDLE_TIMEOUT_MINUTES > 0;
