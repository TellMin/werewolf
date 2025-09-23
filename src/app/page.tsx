"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MessageSender = "local" | "remote";

type ChatMessage = {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: number;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function Home() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const [localDescription, setLocalDescription] = useState("");
  const [remoteDescriptionInput, setRemoteDescriptionInput] = useState("");
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [iceState, setIceState] = useState<RTCIceConnectionState>("new");
  const [channelState, setChannelState] = useState<RTCDataChannelState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const syncLocalDescription = useCallback(() => {
    const description = peerRef.current?.localDescription;
    setLocalDescription(description ? JSON.stringify(description) : "");
  }, []);

  const pushMessage = useCallback((sender: MessageSender, text: string) => {
    setMessages((prev) => [...prev, { id: makeId(), sender, text, timestamp: Date.now() }]);
  }, []);

  const attachDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;
      setChannelState(channel.readyState);

      channel.onclose = () => setChannelState(channel.readyState);
      channel.onopen = () => {
        setChannelState(channel.readyState);
        setNoticeMessage("Data channel is ready. Start chatting!");
      };
      channel.onmessage = (event) => {
        const incoming = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
        pushMessage("remote", incoming);
      };
      channel.onerror = () => {
        setErrorMessage("Data channel error. Try restarting the session.");
      };
    },
    [pushMessage]
  );

  useEffect(() => {
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    peer.onicecandidate = () => {
      syncLocalDescription();
    };
    peer.oniceconnectionstatechange = () => {
      setIceState(peer.iceConnectionState);
    };
    peer.onconnectionstatechange = () => {
      setConnectionState(peer.connectionState);
    };
    peer.ondatachannel = (event) => {
      attachDataChannel(event.channel);
    };

    setConnectionState(peer.connectionState);
    setIceState(peer.iceConnectionState);

    return () => {
      dataChannelRef.current?.close();
      peer.close();
      peerRef.current = null;
    };
  }, [attachDataChannel, syncLocalDescription]);

  const ensurePeer = () => {
    if (!peerRef.current) {
      throw new Error("Peer connection is not ready yet. Refresh the page and try again.");
    }
    return peerRef.current;
  };

  const createOffer = useCallback(async () => {
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const peer = ensurePeer();
      if (!dataChannelRef.current || dataChannelRef.current.readyState === "closed") {
        const channel = peer.createDataChannel("chat");
        attachDataChannel(channel);
      }

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      syncLocalDescription();
      setNoticeMessage("Offer prepared. Share it with your peer.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create offer.");
    }
  }, [attachDataChannel, syncLocalDescription]);

  const applyRemoteDescription = useCallback(async () => {
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const peer = ensurePeer();
      if (!remoteDescriptionInput.trim()) {
        throw new Error("Paste the SDP blob you received before applying it.");
      }

      const remoteDescription = JSON.parse(remoteDescriptionInput) as RTCSessionDescriptionInit;
      if (!remoteDescription.type) {
        throw new Error("Invalid SDP message. Confirm you copied the entire text.");
      }

      await peer.setRemoteDescription(remoteDescription);

      if (remoteDescription.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        syncLocalDescription();
        setNoticeMessage("Answer ready. Send it back to the caller.");
      } else {
        setNoticeMessage("Remote description applied. Waiting for data channel.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to apply the remote description."
      );
    }
  }, [remoteDescriptionInput, syncLocalDescription]);

  const sendMessage = useCallback(() => {
    setErrorMessage(null);

    const channel = dataChannelRef.current;
    const trimmed = draftMessage.trim();

    if (!channel || channel.readyState !== "open") {
      setErrorMessage("Channel not ready. Confirm both peers exchanged offer/answer.");
      return;
    }

    if (!trimmed) {
      return;
    }

    channel.send(trimmed);
    pushMessage("local", trimmed);
    setDraftMessage("");
  }, [draftMessage, pushMessage]);

  const copyLocalDescription = useCallback(async () => {
    setErrorMessage(null);
    setNoticeMessage(null);

    if (!localDescription) {
      setErrorMessage("Nothing to copy yet. Create an offer or answer first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(localDescription);
      setNoticeMessage("Local description copied to clipboard.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Clipboard copy failed. Copy manually instead."
      );
    }
  }, [localDescription]);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          WebRTC P2P Chat Proof-of-Concept
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Exchange the session description (SDP) blobs with another browser window to establish a
          peer-to-peer data channel. Once connected, you can exchange chat messages without a relay
          server.
        </p>
      </header>

      <section className="grid gap-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid gap-2">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Step 1: Create or join
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            The caller clicks <span className="font-medium">Create offer</span> and shares the
            generated blob. The callee pastes the offer below and clicks
            <span className="font-medium"> Apply remote description</span> to produce an answer.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createOffer}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Create offer
            </button>
            <button
              type="button"
              onClick={copyLocalDescription}
              className="inline-flex items-center justify-center rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:bg-indigo-900/20"
            >
              Copy local description
            </button>
          </div>
        </div>

        <label className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          Remote description (paste offer or answer)
          <textarea
            value={remoteDescriptionInput}
            onChange={(event) => setRemoteDescriptionInput(event.target.value)}
            className="min-h-[96px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Paste the remote SDP blob here"
          />
        </label>

        <button
          type="button"
          onClick={applyRemoteDescription}
          className="inline-flex w-fit items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          Apply remote description
        </button>

        <label className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          Local description (share this with your peer)
          <textarea
            value={localDescription}
            onChange={(event) => setLocalDescription(event.target.value)}
            className="min-h-[120px] w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 shadow-inner outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Create an offer or answer to populate this field"
          />
        </label>
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Connection: {connectionState}
          </span>
          <span>ICE: {iceState}</span>
          <span>Channel: {channelState}</span>
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

        <div className="grid gap-3">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Chat</h2>
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            {messages.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                No messages yet. Establish the connection to start chatting.
              </p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex flex-col gap-0.5">
                  <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {message.sender === "local" ? "You" : "Peer"}
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
          This page mirrors the reference signaling flow: peers share SDP blobs manually instead of
          relying on a dedicated signaling service. Replace the manual exchange with a websocket
          gateway (see sample/signaling.gateway.ts) once the backend lands.
        </p>
      </footer>
    </div>
  );
}
