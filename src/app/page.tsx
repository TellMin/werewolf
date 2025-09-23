"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ConnectionStatus = "connecting" | "open" | "closed" | "error";

type MessageSender = "local" | "remote";

type ChatMessage = {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: number;
};

type WelcomeMessage = {
  type: "welcome";
  clientId: string;
};

type ChatServerMessage = {
  type: "chat";
  clientId: string;
  text: string;
  messageId?: string;
  timestamp?: number;
};

type ServerMessage = WelcomeMessage | ChatServerMessage;

const DEFAULT_SIGNALING_ORIGIN = "http://localhost:3001";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const resolveWebSocketUrl = (value: string) => {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol === "https:") {
      url.protocol = "wss:";
    }

    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/ws";
    }

    return url.toString();
  } catch {
    return value;
  }
};

const resolveSignalDisplay = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return value;
  }
};

const SIGNALING_URL =
  resolveWebSocketUrl(process.env.NEXT_PUBLIC_SIGNALING_ORIGIN ?? DEFAULT_SIGNALING_ORIGIN) ||
  resolveWebSocketUrl(DEFAULT_SIGNALING_ORIGIN);

const SIGNALING_DISPLAY = resolveSignalDisplay(
  process.env.NEXT_PUBLIC_SIGNALING_ORIGIN ?? DEFAULT_SIGNALING_ORIGIN
);

export default function Home() {
  const socketRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(
    "Connecting to the signaling service..."
  );

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    const url = SIGNALING_URL;

    if (!url) {
      setConnectionStatus("error");
      setErrorMessage("Signaling URL is not configured.");
      return undefined;
    }

    setConnectionStatus("connecting");
    setNoticeMessage("Connecting to the signaling service...");
    setErrorMessage(null);

    const socket = new WebSocket(url);
    const nextSeenMessageIds = new Set<string>();
    seenMessageIdsRef.current = nextSeenMessageIds;

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      if (socketRef.current !== socket) {
        return;
      }
      setConnectionStatus("open");
      setNoticeMessage("Connected to the signaling service.");
    });

    socket.addEventListener("message", (event) => {
      if (socketRef.current !== socket) {
        return;
      }
      let payload: ServerMessage | null = null;

      try {
        payload = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
      } catch (error) {
        console.warn("Discarding malformed signaling payload", error);
        return;
      }

      if (!payload || typeof payload !== "object" || typeof payload.type !== "string") {
        return;
      }

      if (payload.type === "welcome") {
        if (typeof payload.clientId === "string") {
          clientIdRef.current = payload.clientId;
          setClientId(payload.clientId);
          setNoticeMessage("You're ready to exchange messages through the signaling server.");
        }
        return;
      }

      if (payload.type === "chat") {
        if (typeof payload.text !== "string" || typeof payload.clientId !== "string") {
          return;
        }

        const messageId = typeof payload.messageId === "string" ? payload.messageId : makeId();
        if (seenMessageIdsRef.current.has(messageId)) {
          return;
        }
        seenMessageIdsRef.current.add(messageId);

        const timestamp = typeof payload.timestamp === "number" ? payload.timestamp : Date.now();

        const sender: MessageSender = payload.clientId === clientIdRef.current ? "local" : "remote";

        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            sender,
            text: payload.text,
            timestamp,
          },
        ]);
      }
    });

    socket.addEventListener("error", (event) => {
      if (socketRef.current !== socket) {
        return;
      }
      console.error("Signaling socket error", event);
      setConnectionStatus("error");
      setErrorMessage("The signaling connection encountered an error. Try reconnecting.");
    });

    socket.addEventListener("close", (event) => {
      if (socketRef.current !== socket) {
        return;
      }
      const reason =
        event.code === 1000 ? "Connection closed gracefully." : "Connection closed unexpectedly.";
      setConnectionStatus("closed");
      setNoticeMessage(reason);
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [connectionAttempt]);

  const sendMessage = useCallback(() => {
    const trimmed = draftMessage.trim();
    if (!trimmed) {
      return;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setErrorMessage("Cannot send: signaling connection is not open.");
      return;
    }

    try {
      socket.send(JSON.stringify({ type: "chat", text: trimmed }));
      setDraftMessage("");
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to send message", error);
      setErrorMessage("Failed to send message. Try again.");
    }
  }, [draftMessage]);

  const reconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    setConnectionAttempt((value) => value + 1);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Werewolf Signaling Chat Proof-of-Concept
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Messages now travel through the dedicated signaling service hosted on Render. Use this
          page to verify connectivity before layering on the full Werewolf game flow.
        </p>
      </header>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Connection: {connectionStatus}
          </span>
          <span>Client ID: {clientId ?? "–"}</span>
          <span>Endpoint: {SIGNALING_DISPLAY}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reconnect}
            className="inline-flex items-center justify-center rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:bg-indigo-900/20"
          >
            Reconnect
          </button>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:border-red-500/50 dark:bg-red-500/15 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}

        {noticeMessage ? (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300">
            {noticeMessage}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid gap-3">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Chat</h2>
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            {messages.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                No messages yet. Connect a second browser session to the signaling service to start
                chatting.
              </p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {message.sender === "local" ? "You" : "Peer"} ·{" "}
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  <p className="rounded-md bg-white px-3 py-2 text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
                    {message.text}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Type a message and press Enter"
            />
            <button
              type="button"
              onClick={sendMessage}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Send
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-dashed border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p>
          This proof-of-concept relays chat messages through the Werewolf signaling service. Expand
          the protocol to negotiate WebRTC sessions once the signaling contracts stabilize.
        </p>
      </footer>
    </div>
  );
}
