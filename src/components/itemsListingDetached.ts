// Truly module-scoped slot for ItemsListing's "detached prevState listener".
//
// Declaring the slot inside `<script setup>` would put it inside the per-instance
// setup() closure that Vue's SFC compiler generates, so each ItemsListing instance
// would see its own undefined slot — a second mount would never tear down the
// listener registered by the first unmount, leaking one subscription per back-nav
// round trip. Hoisting the state into a regular .ts module makes it a single
// shared slot across every ItemsListing instance, matching the intent (there is
// exactly one `store.prevState` snapshot at a time).
let detachedPrevStateUnsub: (() => void) | undefined;

// Invoke the registered unsub (if any) and clear the slot. Owning both halves
// here keeps "unsubscribing must also empty the slot" an invariant of the module
// instead of a convention every call site has to remember.
export const teardownDetachedPrevStateUnsub = (): void => {
  detachedPrevStateUnsub?.();
  detachedPrevStateUnsub = undefined;
};

export const setDetachedPrevStateUnsub = (
  fn: (() => void) | undefined,
): void => {
  detachedPrevStateUnsub = fn;
};
