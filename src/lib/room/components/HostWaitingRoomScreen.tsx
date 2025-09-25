"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { joinRoom } from "@/lib/room/api";
import { useRoomPresence, type PresenceParticipant } from "@/lib/room/hooks/useRoomPresence";
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

type JoinStatus = "idle" | "pending" | "success" | "error";

export const HostWaitingRoomScreen = ({
  roomId,
  initialHostToken,
}: HostWaitingRoomScreenProps) => {
  const [origin, setOrigin] = useState<string>("");
  const [host, setHost] = useState<StoredHostRoom | null>(
    initialHostToken ? { token: initialHostToken, createdAt: Date.now() } : null
  );
  const [createdAtDisplay, setCreatedAtDisplay] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);
  const previousTokenRef = useRef<string | null>(null);

  const {
    connectionStatus,
    noticeMessage,
    errorMessage: signalingErrorMessage,
    participants,
    join: joinPresence,
    reconnect,
    signalingDisplay,
  } = useRoomPresence();

  const participantCount = participants.length;

  const formatParticipantName = useCallback((participant: PresenceParticipant) => {
    if (participant.displayName && participant.displayName.trim().length > 0) {
      return participant.displayName.trim();
    }

    return participant.role === "host" ? "Host" : "Guest";
  }, []);

  const connectionStatusLabel = useMemo(() => {
    switch (connectionStatus) {
      case "open":
        return "Connected";
      case "connecting":
        return "Connecting";
      case "closed":
        return "Disconnected";
      case "error":
        return "Error";
      default:
        return connectionStatus;
    }
  }, [connectionStatus]);

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

  useEffect(() => {
    const currentToken = host?.token ?? null;
    if (previousTokenRef.current === currentToken) {
      return;
    }

    previousTokenRef.current = currentToken;
    setJoinStatus("idle");
    setJoinErrorMessage(null);
  }, [host?.token]);

  useEffect(() => {
    if (!host?.token) {
      return;
    }

    joinPresence({
      roomId,
      role: "host",
      hostToken: host.token,
      displayName: null,
    });
  }, [host?.token, joinPresence, roomId]);

  useEffect(() => {
    if (!host?.token) {
      return;
    }

    if (joinStatus !== "idle") {
      return;
    }

    let cancelled = false;
    const hostToken = host.token;

    const registerHost = async () => {
      setJoinStatus("pending");
      setJoinErrorMessage(null);

      try {
        const response = await joinRoom(roomId, {
          role: "host",
          hostToken,
        });

        if (cancelled) {
          return;
        }

        setJoinStatus("success");

        const nextHost: StoredHostRoom = {
          token: hostToken,
          createdAt: response.createdAt,
        };
        setHost(nextHost);
        setStoredHostRoom(roomId, nextHost);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setJoinStatus("error");
        setJoinErrorMessage(
          error instanceof Error ? error.message : "Failed to register the host on the signaling service"
        );
      }
    };

    registerHost();

    return () => {
      cancelled = true;
    };
  }, [host?.token, joinStatus, roomId]);

  const handleRetryJoin = useCallback(() => {
    if (!host?.token) {
      setJoinErrorMessage("Host token is required to join the room.");
      return;
    }

    setJoinErrorMessage(null);
    setJoinStatus("idle");
  }, [host?.token]);

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

      <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Signaling connection</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {`Status: ${connectionStatusLabel}`} (using {signalingDisplay})
          </p>
          {noticeMessage && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{noticeMessage}</p>
          )}

          {signalingErrorMessage && (
            <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-900/30 dark:text-red-200">
              <span>{signalingErrorMessage}</span>
              <button
                type="button"
                onClick={reconnect}
                className="self-start rounded-md border border-red-400 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-400/60 dark:text-red-200 dark:hover:bg-red-900/50"
              >
                Reconnect
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Participants</p>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {participantCount} currently connected
            </span>
          </div>

          {participantCount > 0 ? (
            <ul className="flex flex-col gap-2">
              {participants.map((participant) => {
                const displayName = formatParticipantName(participant);
                return (
                  <li
                    key={participant.clientId}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white/70 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/60"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {participant.isLocal ? `${displayName} (You)` : displayName}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {participant.role === "host" ? "Host" : "Guest"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No participants are connected yet. Share the guest invite link so players can join.
            </p>
          )}
        </div>

        <div className="rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
          {joinStatus === "pending" && <span>Registering host with the signaling service…</span>}
          {joinStatus === "success" && (
            <span className="text-green-700 dark:text-green-300">
              Host registration confirmed. Guests will appear above as they join.
            </span>
          )}
          {joinStatus === "error" && (
            <div className="flex flex-col gap-2">
              <span className="text-red-600 dark:text-red-300">
                {joinErrorMessage ?? "Failed to register host with the signaling service."}
              </span>
              <button
                type="button"
                onClick={handleRetryJoin}
                className="self-start rounded-md border border-red-400 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-400/60 dark:text-red-200 dark:hover:bg-red-900/50"
              >
                Retry registration
              </button>
            </div>
          )}
          {joinStatus === "idle" && !host?.token && (
            <span>Provide a host token to register this tab with the signaling service.</span>
          )}
        </div>
      </section>
    </div>
  );
};
