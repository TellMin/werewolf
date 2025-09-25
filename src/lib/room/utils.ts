const ROOM_STORAGE_PREFIX = "werewolf:host:";

export type StoredHostRoom = {
  token: string;
  createdAt: number;
};

export const setStoredHostRoom = (roomId: string, data: StoredHostRoom) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${ROOM_STORAGE_PREFIX}${roomId}`,
    JSON.stringify(data)
  );
};

export const getStoredHostRoom = (roomId: string): StoredHostRoom | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${ROOM_STORAGE_PREFIX}${roomId}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredHostRoom>;

    if (typeof parsed.token === "string" && typeof parsed.createdAt === "number") {
      return { token: parsed.token, createdAt: parsed.createdAt };
    }
  } catch (error) {
    console.warn("Failed to read host room cache", error);
  }

  return null;
};

export const makeGuestInviteUrl = (origin: string, roomId: string) => {
  if (!origin) {
    return `/rooms/join?roomId=${roomId}`;
  }

  const url = new URL(`/rooms/join`, origin);
  url.searchParams.set("roomId", roomId);
  return url.toString();
};

export const makeHostControlUrl = (origin: string, roomId: string, hostToken: string) => {
  if (!origin) {
    return `/rooms/${roomId}?hostToken=${hostToken}`;
  }

  const url = new URL(`/rooms/${roomId}`, origin);
  url.searchParams.set("hostToken", hostToken);
  return url.toString();
};
