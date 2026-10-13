// Vitest doesn't run inside Next.js's bundler, so the real "server-only"
// package (which unconditionally throws to catch client-component misuse
// at build time) would fail every import in lib/ and features/*/queries.ts
// and actions.ts. Aliased in vitest.config.ts — a true no-op here, since
// Next.js's own build is the thing actually enforcing the server/client
// boundary; these tests only ever run server-side code anyway.
export {};
