import { resolveSignalDisplay, resolveWebSocketUrl } from "./utils";

export const DEFAULT_SIGNALING_ORIGIN = "http://localhost:3001";

const origin = process.env.NEXT_PUBLIC_SIGNALING_ORIGIN ?? DEFAULT_SIGNALING_ORIGIN;

export const SIGNALING_URL =
  resolveWebSocketUrl(origin) || resolveWebSocketUrl(DEFAULT_SIGNALING_ORIGIN);

export const SIGNALING_DISPLAY = resolveSignalDisplay(origin);
