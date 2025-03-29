# [Migration] Convert Project to ElysiaJS

## Description
This todo list tracks the tasks required to migrate the mydraft server project from the current `Bun.serve` implementation to the ElysiaJS framework, running on Bun. The goal is to leverage Elysia's features for better routing, type safety, middleware, and overall developer experience.

- ALWAYS USE CHECKBOXES for tasks.
- Update task status (Active, Pending, Completed) as work progresses.
- Update the Memory section with significant findings, decisions, or challenges encountered during the migration.
- Follow the Memory Section Guidelines defined in `project-rules.mdc`.

## Memory Section Guidelines
- ALWAYS maintain the Memory section in each todo file
- UPDATE the Memory section when:
  - Making significant implementation decisions (e.g., choosing specific Elysia plugins, structuring routes)
  - Overcoming technical challenges (e.g., integrating Hocuspocus with Elysia WebSockets)
  - Discovering future considerations (e.g., performance tuning with Elysia)
  - Gaining new technical insights (e.g., understanding Elysia context and hooks)
  - Adding or modifying dependencies (e.g., adding `elysia`, `@elysiajs/cors`)
- ENSURE the Memory section:
  - Provides clear context for future development on Elysia
  - Documents rationale behind migration choices
  - Tracks evolution of the Elysia implementation
  - Records lessons learned during the migration
  - Notes potential improvements post-migration
- USE the Memory section to:
  - Aid in knowledge transfer about the Elysia version
  - Support maintenance decisions specific to the Elysia framework
  - Guide future enhancements leveraging Elysia features
  - Prevent repeating migration mistakes
  - Maintain context about the Elysia implementation details

## Phase 1: Setup and Basic Server Conversion
- [x] **Dependencies:** Add `elysia` and `@elysiajs/cors` using `bun add elysia @elysiajs/cors`.
- [x] **Server Initialization:** In `index.ts`, replace the `Bun.serve({...})` block with an Elysia instance (`new Elysia()`).
- [x] **CORS:** Integrate `@elysiajs/cors` plugin into the Elysia instance using `.use(cors({...}))` with appropriate configuration.
- [x] **Remove Manual CORS:** Delete the `setCorsHeaders` function and its usages.
- [x] **Basic Error Handling:** Add a basic `.onError` handler to the Elysia instance for centralized error logging/response.
- [x] **Start Server:** Replace `Bun.serve` call with `app.listen(serverPort)`.
- [x] **Remove Old Code:** Delete the main `Bun.serve` block and the `handleWebSocket` function (it will be replaced by Elysia's WS handler).

## Phase 2: Migrating HTTP Routes
- [x] **`/api/health` Route:** Implement the health check using `app.get('/api/health', ...)`.
- [x] **`GET /api/:tokenRead` Route:** Convert the document retrieval logic using `app.get('/api/:tokenRead', async ({ params, set }) => { ... })`. Ensure `storageBucket` is accessible. Determine correct `Content-Type` and return format (Buffer or parsed JSON).
- [x] **`POST /api/` Route:** Convert document creation using `app.post('/api/', async ({ body, set }) => { ... })`. Access request payload via `body`.
- [x] **`PUT /api/:tokenRead/:tokenWrite` Route:** Convert document update using `app.put('/api/:tokenRead/:tokenWrite', async ({ params, body, set }) => { ... })`. Use `params` for tokens and `body` for payload.
- [x] **Static Files:** Implement static file serving for the UI (from `ui/dist`). Use `@elysiajs/static` plugin or create a custom handler/middleware. Replace the `serveStaticFile` function.

## Phase 3: WebSocket Integration
- [x] **Migrate WebSocket Handler:** Replace the old `websocket` configuration with Elysia's `app.ws('/api/collaboration', { ... })`.
- [x] **Hocuspocus Integration:** Adapt the Hocuspocus `handleConnection` call within the `open(ws)` handler of `app.ws`.
    - [x] Verify compatibility of Elysia's `ws` object and context with `hocuspocusServer.handleConnection`.
    - [x] Check if the `createIncomingMessageAdapter` is still needed or if Hocuspocus can work directly with Elysia's context/request information (potentially stored in `ws.data`). Adjust or remove the adapter as necessary.
- [x] **Message/Close Handling:** Determine if Elysia's `message` and `close` handlers for WebSockets need specific logic or if Hocuspocus manages the lifecycle after `handleConnection`.

## Phase 4: Refinement and Testing
- [x] **Refactor Storage Access:** Ensure `storageBucket` (or `fileStore`) is correctly accessed within Elysia handlers (module scope, context decoration, etc.).
- [ ] **Review `stream-helper.ts`:** Evaluate if the `utils.writeAsync` and `utils.endAsync` helpers are still needed for Hocuspocus `store` or if Bun/Elysia/GCS SDK offer better alternatives. Refactor or remove if possible.
- [ ] **Add Validation (Optional but Recommended):** Use Elysia's TypeBox (`t`) integration to add schema validation for route `params` and `body`.
- [ ] **Testing:** Create/update tests for all API endpoints, WebSocket functionality (Hocuspocus connection), and both storage modes (local/GCP).
- [ ] **Documentation:** Update `README.md` and `.cursor/context.md` to reflect the use of ElysiaJS.
- [x] **Cleanup:** Remove unused code, imports, and types from the old `Bun.serve` implementation.
- [ ] **Update `convert-to-bun.md`:** Mark relevant tasks in the old `.cursor/todos/convert-to-bun.md` as completed or superseded by this Elysia migration.

## Memory
*   (2024-06-21) Initial creation of this TODO list for migrating from raw `Bun.serve` to `ElysiaJS`.
*   (2024-06-21) Plan involves replacing manual routing, CORS, and WebSocket handling with Elysia's built-in features and plugins.
*   (2024-06-21) Key challenge identified: Ensuring smooth integration of `@hocuspocus/server`'s `handleConnection` with Elysia's WebSocket implementation, potentially requiring adaptation of how request context is passed.
*   (2024-06-21) Goal is to leverage Elysia for improved code structure, type safety (via validation), and developer experience.
*   (2024-06-21) Implemented Elysia server with CORS plugin replacing manual CORS headers. Migrated all API routes and WebSocket handler. For WebSocket integration with Hocuspocus, created a dummy request with a fixed URL instead of trying to access `ws.url` which doesn't exist in Elysia's WebSocket interface. Also improved error handling to safely access the error message. 