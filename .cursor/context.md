# Project Context: mydraft Server

## Overview
This project serves as the backend for the mydraft application. It handles document storage, retrieval, updates, and real-time collaboration features using WebSockets.

## Architecture
- **Backend Server:** Provides RESTful API endpoints for document CRUD operations and a WebSocket endpoint for collaborative editing.
- **Collaboration:** Uses Hocuspocus server integrated with its Database extension to persist Yjs document updates.
- **Storage:** Implements an abstraction layer allowing storage in either Google Cloud Storage or the local filesystem. This is determined by the `STORAGE_TYPE` environment variable.
- **API Tokens:** Uses `short-unique-id` to generate separate read and write tokens for documents, controlling access permissions.

## Technology Stack (Planned Migration to Bun.js)
- **Runtime:** Bun.js (Migrating from Node.js)
- **Web Server:** Bun's built-in HTTP server (`Bun.serve`) with native WebSocket support (Replacing Express and express-ws)
- **Language:** TypeScript (Leveraging Bun's native TS support)
- **Collaboration:** `@hocuspocus/server`, `@hocuspocus/extension-database`, `@hocuspocus/extension-logger` (Compatibility with Bun to be verified)
- **Cloud Storage:** `@google-cloud/storage` (Compatibility with Bun to be verified)
- **Local Storage:** Custom implementation using Bun's file system APIs (`Bun.file`) (Replacing Node `fs` module)
- **Package Manager:** Bun (Replacing npm)
- **Environment Variables:** Native `.env` support in Bun (Replacing `dotenv` package)
- **Unique IDs:** `short-unique-id`
- **Containerization:** Docker (Using `oven/bun` base image)

## Implementation Status
- Core functionality (API endpoints, WebSocket, storage) implemented using Node.js/Express.
- **Migration to Bun.js is planned/in progress.** See [.cursor/todos/convert-to-bun.md](mdc:.cursor/todos/convert-to-bun.md) for detailed tasks.
- Local file storage (`fileStore.ts`) and Google Cloud Storage integration are functional.
- Basic Docker setup exists for Node.js version.

## Package Relationships
- `index.ts`: Main entry point, sets up server, routing, Hocuspocus, and storage.
- `fileStore.ts`: Implements the storage interface for local file system operations. Needs refactoring for Bun APIs.
- `stream-helper.ts`: Utility functions for Node.js streams. May need refactoring or removal depending on Bun API usage.
- `@hocuspocus/server`: Handles WebSocket connections and document synchronization logic.
- `@google-cloud/storage`: Used when `STORAGE_TYPE` is not 'local'.

## Development Workflow (Post-Migration)
1.  Install dependencies: `bun install`
2.  Run development server: `bun run dev` (Will use Bun's native watch mode)
3.  Build for production: `bun run build` (Will use Bun's bundler/transpiler)
4.  Run production build: `bun ./dist/index.js` or via Docker.

## Environment Variables
- `SERVER_PORT`: Port for the HTTP server (default: 8080).
- `STORAGE_TYPE`: 'local' or 'gcp' (or other value for GCP).
- `STORAGE_GCP_BUCKET_NAME`: Name of the GCS bucket (if using GCP).
