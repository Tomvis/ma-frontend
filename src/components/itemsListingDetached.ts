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

export const getDetachedPrevStateUnsub = (): (() => void) | undefined =>
  detachedPrevStateUnsub;

export const setDetachedPrevStateUnsub = (
  fn: (() => void) | undefined,
): void => {
  detachedPrevStateUnsub = fn;
};
