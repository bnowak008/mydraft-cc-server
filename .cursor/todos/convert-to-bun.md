# [Migration] Convert Project to Bun.js

## Description
This todo list tracks the tasks required to migrate the mydraft server project from Node.js/Express to Bun.js. The goal is to leverage Bun's native APIs for the HTTP server, WebSockets, file system operations, TypeScript execution, and package management, potentially improving performance and simplifying the development setup.

- ALWAYS USE CHECKBOXES for tasks.
- Update task status (Active, Pending, Completed) as work progresses.
- Update the Memory section with significant findings, decisions, or challenges encountered during the migration.

## Memory Section Guidelines
- ALWAYS maintain the Memory section in each todo file
- UPDATE the Memory section when:
  - Making significant implementation decisions (e.g., choosing specific Bun APIs, handling dependency incompatibilities)
  - Overcoming technical challenges (e.g., debugging Bun-specific issues, finding workarounds for Hocuspocus/GCS compatibility)
  - Discovering future considerations (e.g., performance tuning opportunities with Bun)
  - Gaining new technical insights (e.g., understanding Bun's module resolution differences)
  - Adding or modifying dependencies (e.g., removing Node-specific dev deps, adding `bun-types`)
- ENSURE the Memory section:
  - Provides clear context for future development on Bun
  - Documents rationale behind migration choices
  - Tracks evolution of the Bun implementation
  - Records lessons learned during the migration
  - Notes potential improvements post-migration
- USE the Memory section to:
  - Aid in knowledge transfer about the Bun version
  - Support maintenance decisions specific to the Bun runtime
  - Guide future enhancements leveraging Bun features
  - Prevent repeating migration mistakes
  - Maintain context about the Bun implementation details

## Active
- [ ] **Testing:** Test all API endpoints (`/api/health`, `GET /api/:tokenRead`, `POST /api/`, `PUT /api/:tokenRead/:tokenWrite`) thoroughly.
- [ ] **Testing:** Test WebSocket collaboration functionality.
- [ ] **Testing:** Test both local and GCP storage modes. Verify Hocuspocus `fetch` and `store` operations with both storage backends.

## Pending
- [ ] Investigate potential performance improvements using Bun-specific optimizations.
- [ ] Evaluate compatibility of `@google-cloud/storage` and `@hocuspocus/server` long-term with Bun runtime updates.
- [ ] **[Superseded]:** Consider more advanced frameworks like ElysiaJS as alternatives to raw `Bun.serve` → *This has been implemented. See [.cursor/todos/convert-to-elysia.md](mdc:.cursor/todos/convert-to-elysia.md)*

## Completed
- [x] Initial project analysis (2024-06-20).
- [x] Creation of this todo list (2024-06-20).
- [x] **Setup:** Initialize Bun project by adapting existing `package.json` (2024-06-20).
- [x] **Dependencies:** Install existing dependencies using `bun install`. Check for initial compatibility warnings (2024-06-20).
- [x] **Dependencies:** Add `bun-types` for Bun-specific typings (2024-06-20).
- [x] **Dependencies:** Remove Node-specific dev dependencies (`nodemon`, `ts-node`, `dotenv`, `@types/node`, `@types/express`, `@types/express-ws`, `@types/cors`) (2024-06-20).
- [x] **Configuration:** Update `tsconfig.json` (`module`, `types`, potentially `target`) (2024-06-20).
- [x] **Server:** Refactor `index.ts` to replace `express` and `express-ws` with `Bun.serve` (2024-06-20).
- [x] **Server:** Implement routing logic within `Bun.serve`'s `fetch` handler (2024-06-20).
- [x] **Server:** Implement WebSocket handling using `Bun.serve`'s `websocket` property. Integrate Hocuspocus `handleConnection` (2024-06-20).
- [x] **Server:** Replace `cors` middleware with appropriate headers in Bun responses (2024-06-20).
- [x] **File Store:** Refactor `fileStore.ts` to replace `node:fs` with `Bun.file()` APIs (2024-06-20).
- [x] **Streams:** Analyze `stream-helper.ts` and refactor to support both Bun and Node.js stream patterns (2024-06-20).
- [x] **Build:** Update `package.json` scripts (`dev`, `build`, `start`). Use `bun --watch` for development. Use `bun build` for production builds (2024-06-20).
- [x] **Dockerfile:** Update `Dockerfile` to use an `oven/bun` base image. Replace `npm` commands with `bun` commands (2024-06-20).
- [x] **Framework Migration:** Migrated from raw `Bun.serve` implementation to ElysiaJS for improved code structure, better developer experience, and more features (2024-06-21).

## Memory
*   (2024-06-20) Initial decision to migrate to Bun for potential performance gains and simplified tooling (native TS, .env, faster installs).
*   (2024-06-20) Identified key areas for refactoring: Express server, WebSocket handling, Node `fs` usage in `fileStore.ts`, and Dockerfile.
*   (2024-06-20) Need to carefully test Hocuspocus and GCS library compatibility as they might rely on Node-specific APIs not perfectly polyfilled by Bun. `undici` (used by GCS) might be a point of concern.
*   (2024-06-20) Implemented Bun.file() API for local file store operations, replacing Node's fs module. Had to handle directory creation differently with Bun.mkdir().
*   (2024-06-20) Refactored stream-helper.ts to support both Node-style streams and Bun's Web API-compatible streams. Used feature detection to determine the correct approach at runtime.
*   (2024-06-20) Replaced Express and express-ws with Bun.serve's built-in HTTP and WebSocket capabilities. HTTP routes implemented via the fetch handler pattern, and WebSockets through the websocket configuration object.
*   (2024-06-20) Modified the file API response handling for GET requests - switched from piping Node streams to using Bun's download() method to get file content as a buffer and return it in a Response.
*   (2024-06-20) TypeScript configurations updated to use ES modules and target ES2022, with bun-types added for Bun API type support.
*   (2024-06-20) Encountered some typing challenges with Bun's WebSocket handling when integrating with Hocuspocus. Used a more generic approach with type assertions to make them compatible.
*   (2024-06-20) Removed several Node.js specific dependencies that are now provided natively by Bun: dotenv (Bun loads .env files automatically), express/express-ws (using Bun.serve), and several development dependencies.
*   (2024-06-20) Updated Dockerfile to use oven/bun base image and replaced npm commands with bun commands. Changed package installation from Alpine's apk to Debian's apt-get for the git dependency.
*   (2024-06-21) Successfully migrated the codebase from using raw `Bun.serve` to using ElysiaJS. This provides better routing, middleware support, error handling, and WebSocket integration. The code is now more maintainable and follows framework conventions rather than custom routing logic.
