import { AppError } from './errors';

interface Transition<S extends string> {
  from: readonly S[];
  to: S;
}

/** A state machine is a map of NAMED transitions, not a from→to table (CLAUDE.md §4.4). */
export type Machine<S extends string, T extends string> = Record<T, Transition<S>>;

/** Post, Comment, Message: moderation_state. */
export const MODERATION = {
  hide: { from: ['VISIBLE'], to: 'HIDDEN' },
  unhide: { from: ['HIDDEN'], to: 'VISIBLE' },
} as const satisfies Machine<'VISIBLE' | 'HIDDEN', 'hide' | 'unhide'>;

/** User: status. */
export const USER_STATUS = {
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED' },
  reinstate: { from: ['SUSPENDED'], to: 'ACTIVE' },
} as const satisfies Machine<'ACTIVE' | 'SUSPENDED', 'suspend' | 'reinstate'>;

/** Report: status. */
export const REPORT = {
  action: { from: ['OPEN'], to: 'ACTIONED' },
  dismiss: { from: ['OPEN'], to: 'DISMISSED' },
} as const satisfies Machine<'OPEN' | 'ACTIONED' | 'DISMISSED', 'action' | 'dismiss'>;

/**
 * Checks that `transitionName` may run from state `from` and returns the target state.
 * Throws 409 INVALID_TRANSITION otherwise. The caller still writes with a conditional
 * updateMany on `from` (+ updatedAt) and checks count === 1.
 */
export function assertTransition<M extends Record<string, { from: readonly string[]; to: string }>>(
  machine: M,
  from: string,
  transitionName: keyof M & string,
): M[typeof transitionName]['to'] {
  const transition = machine[transitionName];
  if (!transition || !transition.from.includes(from)) {
    throw new AppError(
      'INVALID_TRANSITION',
      409,
      `Cannot ${transitionName} from ${from}`,
      { from, transition: transitionName },
    );
  }
  return transition.to;
}
