"use client";

import type { ConnectionStatus } from "@/lib/signaling/types";

interface ConnectionSummaryCardProps {
  connectionStatus: ConnectionStatus;
  clientId: string | null;
  endpoint: string;
  onReconnect: () => void;
  errorMessage: string | null;
  noticeMessage: string | null;
}

export const ConnectionSummaryCard = ({
  connectionStatus,
  clientId,
  endpoint,
  onReconnect,
  errorMessage,
  noticeMessage,
}: ConnectionSummaryCardProps) => {
  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          Connection: {connectionStatus}
        </span>
        <span>Client ID: {clientId ?? "–"}</span>
        <span>Endpoint: {endpoint}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReconnect}
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
  );
};
