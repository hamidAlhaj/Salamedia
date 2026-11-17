"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import type { CurrentUser } from "@/lib/types";
import { makeStore, type AppStore } from "./store";

/** Creates the store once, hydrated with the user fetched by (app)/layout.tsx (Phase 3). */
export function StoreProvider({ user, children }: { user: CurrentUser | null; children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = makeStore(user);
  return <Provider store={storeRef.current}>{children}</Provider>;
}
