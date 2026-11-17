import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CurrentUser } from "@/lib/types";

// The ONLY client state: the signed-in user's snapshot. Domain data stays on the server.
export type CurrentUserState = CurrentUser | null;

const currentUserSlice = createSlice({
  name: "currentUser",
  initialState: null as CurrentUserState,
  reducers: {
    setCurrentUser: (_state, action: PayloadAction<CurrentUser>) => action.payload,
    clearCurrentUser: () => null,
  },
});

export const { setCurrentUser, clearCurrentUser } = currentUserSlice.actions;
export default currentUserSlice.reducer;
