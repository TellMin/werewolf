"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getStoredHostRoom,
  makeGuestInviteUrl,
  makeHostControlUrl,
  setStoredHostRoom,
  type StoredHostRoom,
} from "@/lib/room/utils";

type HostWaitingRoomScreenProps = {
  roomId: string;
  initialHostToken?: string;
};

export const HostWaitingRoomScreen = ({
  roomId,
  initialHostToken,
}: HostWaitingRoomScreenProps) => {
  const [origin, setOrigin] = useState<string>("");
  const [host, setHost] = useState<StoredHostRoom | null>(
    initialHostToken ? { token: initialHostToken, createdAt: Date.now() } : null
  );
  const [createdAtDisplay, setCreatedAtDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setOrigin(window.location.origin);

    if (initialHostToken) {
      const existing = getStoredHostRoom(roomId);
      const createdAt = existing?.createdAt ?? Date.now();
      const next = { token: initialHostToken, createdAt } satisfies StoredHostRoom;
      setHost(next);
      setStoredHostRoom(roomId, next);
      return;
    }

    const stored = getStoredHostRoom(roomId);
    if (stored) {
      setHost(stored);
    }
  }, [roomId, initialHostToken]);

  useEffect(() => {
    if (!host?.createdAt) {
      setCreatedAtDisplay(null);
      return;
    }

    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    setCreatedAtDisplay(formatter.format(new Date(host.createdAt)));
  }, [host?.createdAt]);

  const guestInviteUrl = useMemo(() => makeGuestInviteUrl(origin, roomId), [origin, roomId]);

  const hostControlUrl = useMemo(() => {
    if (!host?.token) {
      return "";
    }

    return makeHostControlUrl(origin, roomId, host.token);
  }, [origin, roomId, host?.token]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Room</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">Waiting for players</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Share the guest invite link with your friends. This page will show room status once players join.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Room ID
          </span>
          <span className="font-mono text-base text-zinc-900 dark:text-zinc-50">{roomId}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Guest invite link
          </span>
          <a
            href={guestInviteUrl}
            className="truncate font-mono text-xs text-blue-700 underline dark:text-blue-300"
          >
            {guestInviteUrl}
          </a>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Guests join from this URL. It does not contain your host token.
          </span>
        </div>

        {host?.token ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Host link
            </span>
            <Link
              href={{ pathname: `/rooms/${roomId}`, query: { hostToken: host.token } }}
              className="text-sm font-medium text-blue-600 underline dark:text-blue-300"
            >
              Open host controls
            </Link>
            <a
              href={hostControlUrl}
              className="truncate font-mono text-xs text-zinc-700 underline dark:text-zinc-300"
            >
              {hostControlUrl}
            </a>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Keep this URL private. It includes your host token so you can re-enter the room.
            </span>
            <span className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">
              Token: {host.token}
            </span>
          </div>
        ) : (
          <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:border-orange-500/40 dark:bg-orange-950/40 dark:text-orange-200">
            Host token could not be located. Reopen this page from the host link generated when creating the room.
          </div>
        )}

        {createdAtDisplay && (
          <div className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Room created at {createdAtDisplay}</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Waiting for guests…</p>
        <p>
          Once at least one guest joins, you will be able to start the game. Leave this tab open while players connect.
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Guest status updates will appear here in a future iteration.
        </p>
      </section>
    </div>
  );
};
