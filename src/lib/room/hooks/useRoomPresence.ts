"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIGNALING_DISPLAY, SIGNALING_URL } from "@/lib/signaling/config";
import { parseServerMessage } from "@/lib/signaling/parseServerMessage";
import { useSignalingClient } from "@/lib/signaling/useSignalingClient";
import type {
  ConnectionStatus,
  RoomParticipantSummary,
  ServerMessage,
} from "@/lib/signaling/types";

export type PresenceParticipant = RoomParticipantSummary & {
  isLocal: boolean;
};

type JoinIntent = {
  roomId: string;
  role: "host" | "guest";
  displayName?: string | null;
  hostToken?: string | null;
};

interface UseRoomPresenceOptions {
  signalingUrl?: string | null;
  signalingDisplay?: string;
}

interface UseRoomPresenceResult {
  connectionStatus: ConnectionStatus;
  noticeMessage: string | null;
  errorMessage: string | null;
  clientId: string | null;
  participants: PresenceParticipant[];
  signalingDisplay: string;
  join: (intent: JoinIntent) => void;
  reconnect: () => void;
}

const sanitizeSummary = (
  summary: RoomParticipantSummary,
  localParticipant: PresenceParticipant | null
): PresenceParticipant => {
  const isLocal = Boolean(localParticipant && localParticipant.clientId === summary.clientId);
  const displayName = summary.displayName ?? null;
  if (isLocal && localParticipant) {
    return {
      clientId: summary.clientId,
      displayName: localParticipant.displayName,
      role: summary.role,
      isLocal,
    };
  }
  return {
    clientId: summary.clientId,
    displayName,
    role: summary.role,
    isLocal,
  };
};

export const useRoomPresence = (options: UseRoomPresenceOptions = {}): UseRoomPresenceResult => {
  const signalingUrl = options.signalingUrl ?? SIGNALING_URL;
  const signalingDisplay = options.signalingDisplay ?? SIGNALING_DISPLAY;

  const [clientId, setClientId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [joinIntent, setJoinIntent] = useState<JoinIntent | null>(null); // refから状態に変更

  const joinAttemptRef = useRef<number | null>(null);
  const localParticipantRef = useRef<PresenceParticipant | null>(null);
  const participantsRef = useRef<Map<string, PresenceParticipant>>(new Map());
  const clientIdRef = useRef<string | null>(null);

  const commitParticipants = useCallback((snapshot: Map<string, PresenceParticipant>) => {
    setParticipants(Array.from(snapshot.values()));
  }, []);

  const applyRoomState = useCallback(
    (summaries: RoomParticipantSummary[]) => {
      const localParticipant = localParticipantRef.current;
      const snapshot = new Map<string, PresenceParticipant>();

      if (localParticipant) {
        snapshot.set(localParticipant.clientId, { ...localParticipant });
      }

      for (const summary of summaries) {
        const sanitized = sanitizeSummary(summary, localParticipant);
        snapshot.set(sanitized.clientId, sanitized);
      }

      participantsRef.current = snapshot;
      commitParticipants(snapshot);
    },
    [commitParticipants]
  );

  const upsertParticipant = useCallback(
    (summary: RoomParticipantSummary) => {
      const localParticipant = localParticipantRef.current;
      const snapshot = new Map(participantsRef.current);
      const sanitized = sanitizeSummary(summary, localParticipant);
      snapshot.set(sanitized.clientId, sanitized);
      participantsRef.current = snapshot;
      commitParticipants(snapshot);
    },
    [commitParticipants]
  );

  const removeParticipant = useCallback(
    (participantId: string) => {
      const snapshot = new Map(participantsRef.current);
      if (!snapshot.has(participantId)) {
        return;
      }
      snapshot.delete(participantId);

      if (localParticipantRef.current?.clientId === participantId) {
        localParticipantRef.current = null;
      }

      participantsRef.current = snapshot;
      commitParticipants(snapshot);
    },
    [commitParticipants]
  );

  const {
    connectionStatus,
    noticeMessage,
    setNoticeMessage,
    errorMessage,
    setErrorMessage,
    reconnect,
    send,
    connectionAttempt,
    setMessageHandler,
  } = useSignalingClient<ServerMessage>({
    url: signalingUrl,
    parseMessage: parseServerMessage,
    initialNotice: "Connecting to the signaling service...",
  });

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    participantsRef.current = new Map();
    localParticipantRef.current = null;
    setParticipants([]);
    setClientId(null);
    setJoinIntent(null); // 接続リセット時にjoinIntentもクリア
    clientIdRef.current = null;
    joinAttemptRef.current = null;
  }, [connectionAttempt]);

  const handleServerMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case "welcome":
          setClientId(message.clientId);
          clientIdRef.current = message.clientId;
          joinAttemptRef.current = null;
          setNoticeMessage("Connected to the signaling service.");
          setErrorMessage(null);
          break;
        case "room-state":
          applyRoomState(message.participants);
          break;
        case "user-joined":
          upsertParticipant(message.participant);
          break;
        case "user-left":
          removeParticipant(message.clientId);
          break;
        default:
          break;
      }
    },
    [applyRoomState, removeParticipant, setErrorMessage, setNoticeMessage, upsertParticipant]
  );

  useEffect(() => {
    setMessageHandler(handleServerMessage);
    return () => setMessageHandler(null);
  }, [handleServerMessage, setMessageHandler]);

  useEffect(() => {
    if (connectionStatus !== "open") {
      return;
    }

    const currentClientId = clientIdRef.current;

    if (!joinIntent || !currentClientId) {
      return;
    }

    if (joinAttemptRef.current === connectionAttempt) {
      return;
    }

    const payload: Record<string, unknown> = {
      type: "join",
      roomId: joinIntent.roomId,
      role: joinIntent.role,
    };

    if (joinIntent.displayName && joinIntent.displayName.trim().length > 0) {
      payload.displayName = joinIntent.displayName.trim();
    }

    if (joinIntent.hostToken && joinIntent.hostToken.trim().length > 0) {
      payload.hostToken = joinIntent.hostToken.trim();
    }

    const succeeded = send(payload);
    if (!succeeded) {
      return;
    }

    joinAttemptRef.current = connectionAttempt;

    const localParticipant: PresenceParticipant = {
      clientId: currentClientId,
      displayName: joinIntent.displayName?.trim() ?? null,
      role: joinIntent.role,
      isLocal: true,
    };

    localParticipantRef.current = localParticipant;
    const snapshot = new Map(participantsRef.current);
    snapshot.set(localParticipant.clientId, localParticipant);
    participantsRef.current = snapshot;
    commitParticipants(snapshot);
  }, [commitParticipants, connectionAttempt, connectionStatus, send, joinIntent]); // joinIntentを依存配列に追加

  const join = useCallback(
    (intent: JoinIntent) => {
      const normalized: JoinIntent = {
        roomId: intent.roomId.trim(),
        role: intent.role,
        displayName: intent.displayName ? intent.displayName.trim() : null,
        hostToken: intent.hostToken ? intent.hostToken.trim() : null,
      };

      setJoinIntent(normalized); // 状態を更新
      joinAttemptRef.current = null;

      if (clientIdRef.current) {
        const localParticipant: PresenceParticipant = {
          clientId: clientIdRef.current,
          displayName: normalized.displayName ?? null,
          role: normalized.role,
          isLocal: true,
        };

        localParticipantRef.current = localParticipant;
        const snapshot = new Map(participantsRef.current);
        snapshot.set(localParticipant.clientId, localParticipant);
        participantsRef.current = snapshot;
        commitParticipants(snapshot);
      }
    },
    [commitParticipants]
  );

  return {
    connectionStatus,
    noticeMessage,
    errorMessage,
    clientId,
    participants,
    signalingDisplay,
    join,
    reconnect,
  };
};
