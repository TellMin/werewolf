import type { RoomParticipantSummary, ServerMessage } from "./types";

const parseParticipantSummary = (value: unknown): RoomParticipantSummary | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const clientId = typeof record.clientId === "string" ? record.clientId : null;
  const role = record.role === "host" || record.role === "guest" ? record.role : null;

  if (!clientId || !role) {
    return null;
  }

  const displayName =
    typeof record.displayName === "string" && record.displayName.trim().length > 0
      ? record.displayName
      : null;

  return {
    clientId,
    displayName,
    role,
  } satisfies RoomParticipantSummary;
};

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

  if (type === "room-state") {
    if (!Array.isArray(record.participants)) {
      return null;
    }

    const participants = record.participants
      .map((item) => parseParticipantSummary(item))
      .filter((item): item is RoomParticipantSummary => item !== null);

    return {
      type: "room-state",
      participants,
    } satisfies ServerMessage;
  }

  if (type === "user-joined") {
    const participant = parseParticipantSummary(record.participant);
    if (!participant) {
      return null;
    }

    return {
      type: "user-joined",
      participant,
    } satisfies ServerMessage;
  }

  if (type === "user-left") {
    if (typeof record.clientId !== "string") {
      return null;
    }

    return {
      type: "user-left",
      clientId: record.clientId,
    } satisfies ServerMessage;
  }

  if (type === "signal") {
    if (typeof record.from !== "string") {
      return null;
    }

    return {
      type: "signal",
      from: record.from,
      payload: record.payload,
    } satisfies ServerMessage;
  }

  return null;
};
