# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev            # Dev server at http://localhost:3000
yarn build          # Type-check (vue-tsc --noEmit) then Vite build
yarn lint           # ESLint with auto-fix
yarn test           # Vitest watch mode
yarn test:run       # Single test run
yarn test:coverage  # Coverage report
```

Output compiles to `./music_assistant_frontend/`.

## Architecture

**Stack**: Vue 3 + TypeScript + Vite. PWA with service worker.

**UI framework migration in progress**: The codebase is moving from Vuetify 3 to shadcn-vue (reka-ui + Tailwind CSS 4). New components should use shadcn-vue; existing Vuetify components are being migrated incrementally.

### State Management

No Vuex/Pinia. State lives in two reactive objects:

- `src/plugins/store.ts` — UI state (`activePlayerId`, `showFullscreenPlayer`, `libraryArtistsCount`, etc.). Import as `import { store } from "@/plugins/store"`.
- `src/plugins/api/index.ts` — Server state: `api.players`, `api.queues`, `api.providers`, `api.queueElapsedTime` are all `reactive()` maps keyed by ID. Import as `import { api } from "@/plugins/api"`.

Shared logic goes into composables under `src/composables/`. Pure utility functions go in `src/helpers/` with colocated `.test.ts` files.

### API / Connection Layer

The app communicates with the Music Assistant server over a transport abstraction (`src/plugins/remote/`). Three transports exist: `WebSocketTransport` (direct), `WebRTCTransport` (P2P encrypted remote), and `HttpProxyBridge` (service-worker proxy). All implement `ITransport`.

Connection state machine: `DISCONNECTED → CONNECTING → CONNECTED → AUTHENTICATED → INITIALIZED`

Commands are JSON-RPC style: `{ command, args, msg_id }`. Server events are subscribed via `api.subscribe(EventType, callback)`. `App.vue` drives initialization: on `AUTHENTICATED`, it calls `completeInitialization()` which fetches library counts, enables plugins, and sets up event subscriptions.

### Router

Hash-based history (`createWebHashHistory`). Three top-level routes:
- `/` — Main app (Default layout with player controls + nav)
- `/guest` — Party guest view (no web player)
- `/party` — Party dashboard (requires party plugin)

All routes use dynamic imports for code splitting. Route guards enforce admin-only access for settings and party-plugin availability for `/party`.

### Web Player

`src/plugins/web_player.ts` manages in-browser audio playback via Sendspin. Uses `BroadcastChannel` to coordinate across tabs (only one tab plays at a time). Player mode is one of: `DISABLED`, `CONTROLS_ONLY`, `SENDSPIN_ONLY`, `SENDSPIN_WITH_CONTROLS`.

### Path Aliases

`@` → `src/`, `@plugins` → `src/plugins/`, `@components` → `src/components/`, `@views` → `src/views/`, `@layout` → `src/layout/`

## Development Notes

- Components should stay under 300–400 lines with single responsibility.
- TypeScript strict mode is enabled — always type props/emits, no implicit `any`.
- Tests are colocated next to source files (e.g., `src/helpers/string.test.ts`). New helper functions require tests.
- API calls should show feedback via `toast.success()` / `toast.error()` from `vue-sonner`.
- Translations use Vue-i18n; all user-facing strings must use `t("key")`. Translations are managed via Lokalise.
