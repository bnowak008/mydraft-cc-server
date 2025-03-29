# Project Context: mydraft Server

## Overview
This project serves as the backend for the mydraft application. It handles document storage, retrieval, updates, and real-time collaboration features using WebSockets.

## Architecture
- **Backend Server:** Provides RESTful API endpoints for document CRUD operations and a WebSocket endpoint for collaborative editing.
- **Collaboration:** Uses Hocuspocus server integrated with its Database extension to persist Yjs document updates.
- **Storage:** Implements an abstraction layer allowing storage in either Google Cloud Storage or the local filesystem. This is determined by the `STORAGE_TYPE` environment variable.
- **API Tokens:** Uses `short-unique-id` to generate separate read and write tokens for documents, controlling access permissions.

## Technology Stack
- **Runtime:** Bun.js
- **Web Framework:** ElysiaJS (Lightweight framework built for Bun)
- **Language:** TypeScript (Leveraging Bun's native TS support)
- **Plugins:**
  - `@elysiajs/cors`: For handling CORS
- **Collaboration:** `@hocuspocus/server`, `@hocuspocus/extension-database`, `@hocuspocus/extension-logger`
- **Cloud Storage:** `@google-cloud/storage`
- **Local Storage:** Custom implementation using Bun's file system APIs (`Bun.file`)
- **Package Manager:** Bun
- **Environment Variables:** Native `.env` support in Bun
- **Unique IDs:** `short-unique-id`
- **Containerization:** Docker (Using `oven/bun` base image)

## Implementation Status
- Core functionality (API endpoints, WebSocket, storage) implemented using ElysiaJS.
- Successfully migrated from raw `Bun.serve` to ElysiaJS. See [.cursor/todos/convert-to-elysia.md](mdc:.cursor/todos/convert-to-elysia.md) for details on the migration.
- Local file storage (`fileStore.ts`) and Google Cloud Storage integration are functional.
- Basic Docker setup exists using the `oven/bun` base image.

## Package Relationships
- `index.ts`: Main entry point, sets up ElysiaJS server, routes, Hocuspocus, and storage.
- `fileStore.ts`: Implements the storage interface for local file system operations using Bun's file APIs.
- `stream-helper.ts`: Utility functions for stream operations, used by Hocuspocus for storing documents.
- `@hocuspocus/server`: Handles WebSocket connections and document synchronization logic.
- `@google-cloud/storage`: Used when `STORAGE_TYPE` is not 'local'.
- `elysia`: Core web framework providing routing, middleware, and WebSocket support.
- `@elysiajs/cors`: Plugin for handling Cross-Origin Resource Sharing.

## API Endpoints
- **GET /api/health**: Health check endpoint
- **GET /api/:tokenRead**: Retrieve a document using its read token
- **POST /api/**: Create a new document, returns read and write tokens
- **PUT /api/:tokenRead/:tokenWrite**: Update a document using both tokens
- **WebSocket /api/collaboration**: WebSocket endpoint for collaborative editing

## Development Workflow
1.  Install dependencies: `bun install`
2.  Run development server: `bun run dev` (Using Bun's native watch mode)
3.  Build for production: `bun run build` (Using Bun's bundler)
4.  Run production build: `bun ./dist/index.js` or via Docker.

## Environment Variables
- `SERVER_PORT`: Port for the HTTP server (default: 8080).
- `STORAGE_TYPE`: 'local' or 'gcp' (or other value for GCP).
- `STORAGE_GCP_BUCKET_NAME`: Name of the GCS bucket (if using GCP).
