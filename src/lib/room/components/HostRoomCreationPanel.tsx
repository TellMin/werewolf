"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoom, type CreateRoomResponse } from "@/lib/room/api";
import {
  makeGuestInviteUrl,
  makeHostControlUrl,
  setStoredHostRoom,
} from "@/lib/room/utils";

type Status = "idle" | "pending" | "success" | "error";

export const HostRoomCreationPanel = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [room, setRoom] = useState<CreateRoomResponse | null>(null);
  const [origin, setOrigin] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleCreateRoom = useCallback(async () => {
    setStatus("pending");
    setErrorMessage(null);

    try {
      const created = await createRoom();
      setStoredHostRoom(created.roomId, {
        token: created.hostToken,
        createdAt: created.createdAt,
      });
      setRoom(created);
      setStatus("success");

      router.push(
        `/rooms/${encodeURIComponent(created.roomId)}?hostToken=${encodeURIComponent(created.hostToken)}`
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました");
    }
  }, [router]);

  const guestInviteUrl = useMemo(() => {
    if (!room) {
      return "";
    }

    return makeGuestInviteUrl(origin, room.roomId);
  }, [origin, room]);

  const hostControlUrl = useMemo(() => {
    if (!room) {
      return "";
    }

    return makeHostControlUrl(origin, room.roomId, room.hostToken);
  }, [origin, room]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          Host a Werewolf Room
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Create a private room on the signaling service and share the invite link with players. Keep
          the host link safe—it contains your room owner token.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        <button
          type="button"
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          onClick={handleCreateRoom}
          disabled={status === "pending"}
        >
          {status === "pending" ? "Creating room..." : "Create room"}
        </button>

        {status === "error" && errorMessage && (
          <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
            {errorMessage}
          </p>
        )}

        {room && (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm dark:border-zinc-600 dark:bg-zinc-950/70">
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-100">Room ID</p>
              <p className="font-mono text-base text-zinc-900 dark:text-zinc-50">{room.roomId}</p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-medium text-zinc-800 dark:text-zinc-100">Guest invite link</p>
              <a
                href={guestInviteUrl}
                className="truncate font-mono text-xs text-zinc-700 underline dark:text-zinc-300"
              >
                {guestInviteUrl}
              </a>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Share this URL with players joining as guests.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-medium text-zinc-800 dark:text-zinc-100">Host control link</p>
              <Link
                href={{ pathname: `/rooms/${room.roomId}`, query: { hostToken: room.hostToken } }}
                className="text-sm font-medium text-blue-600 underline dark:text-blue-300"
              >
                Open host dashboard
              </Link>
              <a
                href={hostControlUrl}
                className="truncate font-mono text-xs text-zinc-700 underline dark:text-zinc-300"
              >
                {hostControlUrl}
              </a>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This URL includes your host token. Bookmark it or keep the token safe to rejoin later.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-medium text-zinc-800 dark:text-zinc-100">Host token</p>
              <p className="truncate font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {room.hostToken}
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-dashed border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p>
          Rooms are currently stored in memory on the signaling service. Restarting the service will
          clear active sessions.
        </p>
      </footer>
    </div>
  );
};
