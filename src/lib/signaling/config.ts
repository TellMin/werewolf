import { resolveSignalDisplay, resolveWebSocketUrl } from "./utils";

export const DEFAULT_SIGNALING_ORIGIN = "http://localhost:3001";

export const SIGNALING_HTTP_ORIGIN =
  process.env.NEXT_PUBLIC_SIGNALING_ORIGIN ?? DEFAULT_SIGNALING_ORIGIN;

export const SIGNALING_URL =
  resolveWebSocketUrl(SIGNALING_HTTP_ORIGIN) || resolveWebSocketUrl(DEFAULT_SIGNALING_ORIGIN);

export const SIGNALING_DISPLAY = resolveSignalDisplay(SIGNALING_HTTP_ORIGIN);
