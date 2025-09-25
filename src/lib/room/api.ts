export type CreateRoomResponse = {
  roomId: string;
  hostToken: string;
  createdAt: number;
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
