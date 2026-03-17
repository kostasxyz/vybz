# Efficiency Review

Date: 2026-03-17

## Scope

Reviewed the Vybz frontend and Tauri PTY path for avoidable render churn, persistence overhead, terminal I/O costs, and bundle size.

## Main Findings

1. The app originally published the full `AppState` through one React context value.
That forced broad rerenders across `App`, `Sidebar`, `MainArea`, settings views, and the mounted terminal tree on routine actions like tab switches, font changes, renames, and view toggles.

2. Persistence was overly chatty.
Each save path reopened the Tauri store and saved independently, which created avoidable async and disk I/O during common interactions.

3. The terminal path did extra allocation and IPC work.
Incoming output allocated new arrays per chunk, outgoing input encoded and sent on every event, and the Rust writer flushed every write.

4. The initial frontend bundle was too heavy.
`xterm`, the fit addon, and terminal CSS were on the startup path even before the user needed terminals.

5. In development, `React.StrictMode` caused extra PTY churn because terminal mount effects ran twice.

## Changes Implemented

1. Replaced the whole-app context subscription model with a small external store plus selector subscriptions using `useSyncExternalStore`.
This reduces rerenders to the components that actually read the changed slice.

2. Added reducer guards for no-op updates.
Actions that do not change state now return the existing object instead of invalidating subscribers.

3. Reworked persistence into a cached store handle with a single debounced save pipeline.
This avoids repeated `load()` calls and serializes saves so quick UI changes do not race each other.

4. Memoized terminal rendering boundaries.
`TabBar`, `TerminalPanels`, and `TerminalView` now avoid repainting when their props are unchanged.

5. Lazy-loaded the terminal stack.
The terminal panel moved behind a dynamic import so startup does not pay for `xterm` until terminal UI is actually needed.

6. Reduced terminal IPC churn.
Keyboard input is batched into a short-lived buffer before sending to Tauri, and the Rust PTY writer no longer flushes every write.

7. Disabled `StrictMode` only in development.
Production keeps `StrictMode`; local dev now matches terminal lifecycle more closely and avoids duplicate PTY work.

## Measured Result

Before the refactor:

- Frontend build produced one `598.13 kB` minified JS chunk (`161.43 kB` gzip).

After the refactor:

- Initial chunk: `268.24 kB` minified (`78.73 kB` gzip)
- Lazy terminal chunk: `332.76 kB` minified (`84.00 kB` gzip)

This does not reduce total shipped JS dramatically, but it removes the terminal stack from the initial load path and improves startup responsiveness.

## Keep Every Tab Alive

Current meaning:

- Every tab keeps its PTY session alive
- Every tab keeps its `xterm` instance alive
- Every tab keeps its DOM subtree mounted, usually hidden with `display: none`

This is the safest model for fidelity because full-screen terminal apps, scrollback, cursor state, and shell session state remain exactly as-is.

## Is There Another Way?

Yes, but there are two materially different options.

### Option A: PTY Manager + Live `xterm` Instances Outside React

Move tab session ownership out of React and into a dedicated session manager keyed by tab id.

Per tab, store:

- PTY session id
- `xterm` instance
- fit addon
- current cwd/metadata
- attachment status

React would render lightweight hosts and ask the manager to attach the already-existing terminal instance to the visible host.

Benefits:

- Preserves session fidelity
- Removes React component lifetime from terminal lifetime
- Makes project/settings navigation cheap
- Simplifies future tab virtualization decisions

Limitation:

- Memory use stays relatively high because hidden tabs still keep live `xterm` objects

This is the lowest-risk next step if more cleanup is needed.

### Option B: Keep PTY Alive, Recreate `xterm` On Demand

Keep only the PTY session alive for hidden tabs.
Dispose the inactive `xterm` instance, buffer terminal output, and rebuild the view when the tab becomes active again.

Per tab, store:

- PTY session id
- output ring buffer or serialized transcript
- dimensions
- liveness/status metadata

Benefits:

- Largest memory reduction
- Fewer hidden DOM nodes
- Fewer live terminal objects

Risks:

- Reconstructing exact terminal state is hard
- Alternate-screen TUIs like `vim`, `less`, `htop`, and similar apps may not restore perfectly
- Replaying long transcripts can be expensive
- A small buffer may lose enough control sequence history to rebuild the current screen faithfully

This option is only safe if terminal fidelity is negotiable or if the implementation keeps richer terminal state than plain scrollback.

## Recommendation

If the requirement is strict session fidelity, keep PTY sessions and live `xterm` instances alive, but decouple them from React component lifetime.

Recommended next architecture:

1. Introduce a `TerminalSessionManager` module outside React.
2. Create sessions once per tab and keep them in a map keyed by tab id.
3. Let React render host containers only.
4. Attach the active session view to the current host on selection.
5. Keep hidden sessions out of normal React rerender paths.
6. Only consider full `xterm` disposal for inactive tabs if memory pressure becomes a real measured problem.

That path keeps the current UX guarantee while avoiding most of the UI-level cost.

## Practical Follow-Up

If we continue on this track, the next useful changes are:

1. Move terminal session ownership into a dedicated manager instead of hook-local refs.
2. Add lightweight profiling around tab switch latency and total memory per open tab.
3. Only pursue inactive-`xterm` disposal if measured memory pressure justifies the complexity and fidelity risk.
