"use client";

import { useEffect, useState } from "react";

const POLL_MS = 2000;

export type FetchState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; notFound?: boolean }
  | { status: "ready"; data: T };

async function fetchJson<T>(url: string): Promise<FetchState<T>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { status: "error", message: body?.error ?? `Request failed (${res.status}).`, notFound: res.status === 404 };
    return { status: "ready", data: body as T };
  } catch {
    return { status: "error", message: "Couldn't reach the server. Check that the app is running." };
  }
}

/**
 * Fetch JSON from our API, and keep polling while `shouldPoll(data)` is true
 * (i.e. while Claude is still working on something on screen).
 */
export function usePolledJson<T>(url: string, shouldPoll: (data: T) => boolean) {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchJson<T>(url).then((next) => !cancelled && setState(next));
    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  const polling = state.status === "ready" && shouldPoll(state.data);
  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    const t = setInterval(() => {
      fetchJson<T>(url).then((next) => {
        // A failed background poll shouldn't wipe data that's already on screen.
        if (!cancelled && next.status === "ready") setState(next);
      });
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [polling, url]);

  const reload = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  return { state, reload, setState };
}
