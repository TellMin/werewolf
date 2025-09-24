import type { ServerMessage } from "./types";

export const parseServerMessage = (value: unknown): ServerMessage | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : null;

  if (type === "welcome") {
    if (typeof record.clientId === "string") {
      return {
        type: "welcome",
        clientId: record.clientId,
      };
    }
    return null;
  }

  if (type === "chat") {
    if (typeof record.clientId !== "string" || typeof record.text !== "string") {
      return null;
    }

    const message: ServerMessage = {
      type: "chat",
      clientId: record.clientId,
      text: record.text,
    };

    if (typeof record.messageId === "string") {
      message.messageId = record.messageId;
    }

    if (typeof record.timestamp === "number") {
      message.timestamp = record.timestamp;
    }

    return message;
  }

  return null;
};
