export type CreateRoomResponse = {
  roomId: string;
  hostToken: string;
  createdAt: number;
};

export type JoinRoomPayload = {
  displayName?: string | null;
  role?: "host" | "guest";
  hostToken?: string;
};

export type JoinRoomParticipant = {
  participantId: string;
  displayName: string | null;
  role: "host" | "guest";
  joinedAt: number;
};

export type JoinRoomResponse = {
  roomId: string;
  participantId: string;
  role: "host" | "guest";
  displayName: string | null;
  joinedAt: number;
  createdAt: number;
  participants: JoinRoomParticipant[];
};

export const createRoom = async (init?: RequestInit): Promise<CreateRoomResponse> => {
  const response = await fetch("/api/rooms/create", {
    method: "POST",
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Failed to create room: ${response.status}`);
  }

  const payload = (await response.json()) as Partial<CreateRoomResponse>;

  if (!payload.roomId || !payload.hostToken || typeof payload.createdAt !== "number") {
    throw new Error("Unexpected response from signaling service");
  }

  return {
    roomId: payload.roomId,
    hostToken: payload.hostToken,
    createdAt: payload.createdAt,
  };
};

export const joinRoom = async (
  roomId: string,
  payload: JoinRoomPayload,
  init?: RequestInit
): Promise<JoinRoomResponse> => {
  if (!roomId || typeof roomId !== "string") {
    throw new Error("roomId must be provided");
  }

  const mergedHeaders = new Headers(init?.headers);
  if (!mergedHeaders.has("content-type")) {
    mergedHeaders.set("content-type", "application/json");
  }

  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    ...init,
    method: "POST",
    headers: mergedHeaders,
    body: JSON.stringify({
      displayName: payload.displayName ?? null,
      role: payload.role ?? "guest",
      hostToken: payload.hostToken ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to join room: ${response.status}`);
  }

  const body = (await response.json()) as Partial<JoinRoomResponse>;

  if (
    !body ||
    typeof body.roomId !== "string" ||
    typeof body.participantId !== "string" ||
    typeof body.joinedAt !== "number" ||
    typeof body.createdAt !== "number" ||
    (body.role !== "host" && body.role !== "guest") ||
    !Array.isArray(body.participants)
  ) {
    throw new Error("Unexpected response from signaling service");
  }

  const participants: JoinRoomParticipant[] = body.participants
    .map((participant) => {
      if (
        participant &&
        typeof participant === "object" &&
        typeof participant.participantId === "string" &&
        (participant.role === "host" || participant.role === "guest") &&
        typeof participant.joinedAt === "number"
      ) {
        return {
          participantId: participant.participantId,
          displayName:
            typeof participant.displayName === "string" ? participant.displayName : null,
          role: participant.role,
          joinedAt: participant.joinedAt,
        } satisfies JoinRoomParticipant;
      }
      return null;
    })
    .filter((participant): participant is JoinRoomParticipant => participant !== null);

  return {
    roomId: body.roomId,
    participantId: body.participantId,
    role: body.role,
    displayName: typeof body.displayName === "string" ? body.displayName : null,
    joinedAt: body.joinedAt,
    createdAt: body.createdAt,
    participants,
  };
};
