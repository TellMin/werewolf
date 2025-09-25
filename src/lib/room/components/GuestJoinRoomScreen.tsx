"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { joinRoom } from "@/lib/room/api";
import { useRoomPresence, type PresenceParticipant } from "@/lib/room/hooks/useRoomPresence";

const DEFAULT_STATUS_MESSAGE = "Share your display name and join the room to start signaling.";

type JoinStatus = "idle" | "pending" | "success" | "error";

type GuestJoinRoomScreenProps = {
  initialRoomId?: string | null;
};

const formatParticipantName = (participant: PresenceParticipant) => {
  if (participant.displayName && participant.displayName.trim().length > 0) {
    return participant.displayName.trim();
  }

  return participant.role === "host" ? "Host" : "Guest";
};

const makeConnectionStatusLabel = (status: string) => {
  switch (status) {
    case "open":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "closed":
      return "Disconnected";
    case "error":
      return "Error";
    default:
      return status;
  }
};

export const GuestJoinRoomScreen = ({ initialRoomId }: GuestJoinRoomScreenProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramRoomId = searchParams?.get("roomId");
  const [roomId, setRoomId] = useState<string | null>(() => {
    if (initialRoomId && initialRoomId.trim().length > 0) {
      return initialRoomId.trim();
    }
    if (paramRoomId && paramRoomId.trim().length > 0) {
      return paramRoomId.trim();
    }
    return null;
  });

  useEffect(() => {
    if (!paramRoomId || paramRoomId.trim().length === 0) {
      return;
    }

    const normalized = paramRoomId.trim();
    setRoomId((current) => {
      if (current && current.toUpperCase() === normalized.toUpperCase()) {
        return current;
      }
      return normalized;
    });
  }, [paramRoomId]);

  const [displayName, setDisplayName] = useState<string>("");
  const [status, setStatus] = useState<JoinStatus>("idle");
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [joinedDisplayName, setJoinedDisplayName] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const {
    connectionStatus,
    noticeMessage,
    errorMessage: signalingErrorMessage,
    participants,
    join: joinPresence,
    reconnect,
    signalingDisplay,
  } = useRoomPresence();

  const normalizedRoomId = useMemo(() => {
    if (!roomId) {
      return "";
    }
    return roomId.trim().toUpperCase();
  }, [roomId]);

  const connectionStatusLabel = useMemo(
    () => makeConnectionStatusLabel(connectionStatus),
    [connectionStatus]
  );

  const participantCount = participants.length;

  const handleJoinRoom = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setHasSubmitted(true);

      if (!roomId || roomId.trim().length === 0) {
        setJoinErrorMessage("Room id is required.");
        setStatus("error");
        return;
      }

      const trimmedRoomId = roomId.trim();
      const trimmedDisplayName = displayName.trim();

      setStatus("pending");
      setJoinErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await joinRoom(trimmedRoomId, {
          role: "guest",
          displayName: trimmedDisplayName.length > 0 ? trimmedDisplayName : null,
        });

        setStatus("success");
        const resolvedDisplayName =
          typeof response.displayName === "string" && response.displayName.trim().length > 0
            ? response.displayName.trim()
            : trimmedDisplayName.length > 0
              ? trimmedDisplayName
              : null;
        setJoinedDisplayName(resolvedDisplayName);
        setSuccessMessage("You joined the room. Keep this tab open while playing.");

        joinPresence({
          roomId: response.roomId,
          role: "guest",
          displayName: resolvedDisplayName,
        });
      } catch (error) {
        console.error("Failed to join room", error);
        setStatus("error");
        setJoinErrorMessage(
          error instanceof Error ? error.message : "Failed to join the room. Please try again."
        );
      }
    },
    [displayName, joinPresence, roomId]
  );

  const handleRoomIdChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setRoomId(event.target.value.toUpperCase());
      if (status === "error") {
        setStatus("idle");
        setJoinErrorMessage(null);
      }
    },
    [status]
  );

  const handleDisplayNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDisplayName(event.target.value);
  }, []);

  const handleReconnect = useCallback(() => {
    reconnect();
  }, [reconnect]);

  const handleClearRoomId = useCallback(() => {
    setRoomId(null);
    setStatus("idle");
    setJoinErrorMessage(null);
    setSuccessMessage(null);
    setJoinedDisplayName(null);
    setHasSubmitted(false);
    setDisplayName("");
    router.replace("/rooms/join");
  }, [router]);

  const finalDisplayName = joinedDisplayName ?? displayName.trim();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Join</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Join a Werewolf Room
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Enter the room id shared by the host, pick a display name, and connect through the
          signaling service.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        <form className="flex flex-col gap-4" onSubmit={handleJoinRoom}>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Room ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={normalizedRoomId}
                onChange={handleRoomIdChange}
                placeholder="ABC123"
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono uppercase tracking-wide text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                maxLength={12}
                disabled={status === "pending" || status === "success"}
              />
              {roomId && (
                <button
                  type="button"
                  onClick={handleClearRoomId}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Edit
                </button>
              )}
            </div>
            {hasSubmitted && !roomId && (
              <p className="text-xs text-red-600 dark:text-red-300">Enter a room id to continue.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="Optional nickname"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              maxLength={40}
              disabled={status === "pending" || status === "success"}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Leave blank to join anonymously.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-base font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={!roomId || status === "pending" || status === "success"}
            >
              {status === "pending" ? "Joining…" : status === "success" ? "Joined" : "Join room"}
            </button>
          </div>

          {status === "error" && joinErrorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-900/30 dark:text-red-200">
              {joinErrorMessage}
            </div>
          )}

          {status !== "success" && (!noticeMessage || connectionStatus !== "open") && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{DEFAULT_STATUS_MESSAGE}</p>
          )}

          {status === "success" && successMessage && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-500/40 dark:bg-green-900/30 dark:text-green-200">
              {successMessage}
            </div>
          )}
        </form>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Signaling connection
          </p>
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
                onClick={handleReconnect}
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
                const name = formatParticipantName(participant);
                return (
                  <li
                    key={participant.clientId}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white/70 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/60"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {participant.isLocal ? `${name} (You)` : name}
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
              Connected participants will appear here once you join the room.
            </p>
          )}
        </div>

        {status === "success" && finalDisplayName && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            You are connected as{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{finalDisplayName}</span>
            .
          </p>
        )}
      </section>
    </div>
  );
};

export default GuestJoinRoomScreen;
