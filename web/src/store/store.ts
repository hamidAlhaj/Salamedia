import { configureStore } from "@reduxjs/toolkit";
import type { CurrentUser } from "@/lib/types";
import currentUser from "./currentUserSlice";

/** A new store per request/provider, so server renders never share state between users. */
export function makeStore(initialUser: CurrentUser | null = null) {
  return configureStore({
    reducer: { currentUser },
    preloadedState: { currentUser: initialUser },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
