// Bun automatically loads .env files, no need for dotenv import
import { Database } from '@hocuspocus/extension-database';
import { Logger } from '@hocuspocus/extension-logger';
import { Server } from '@hocuspocus/server';
import { Bucket, Storage } from '@google-cloud/storage';
import { utils } from './stream-helper';
import ShortUniqueId from 'short-unique-id';
import fileStore from './fileStore';
import { join } from 'path';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';

// Define WebSocket type for Bun
interface WebSocketData {
    request: Request;
}

const uid = new ShortUniqueId({ length: 20 });
const serverPort = parseInt(process.env.SERVER_PORT || '8080');

let storageBucket: Bucket | typeof fileStore;
if (process.env.STORAGE_TYPE === "local") {
    storageBucket = fileStore;
} else {
    const storageClient = new Storage();
    storageBucket = storageClient.bucket(process.env.STORAGE_GCP_BUCKET_NAME || 'athene-diagram-files');
}

const hocuspocusServer = Server.configure({
    extensions: [
        new Database({
            fetch: async ({ documentName }) => {
                const file = storageBucket.file(`collaboration/${documentName}`);
                
                const [exists] = await file.exists();
                if (!exists) {
                    return null;
                }

                const buffers = await file.download();

                return Buffer.concat(buffers);
            },
            store: async ({ documentName, state }) => {
                const file = storageBucket.file(`collaboration/${documentName}`);

                const stream = file.createWriteStream();

                await utils.writeAsync(stream, state);
                await utils.endAsync(stream);
            },
        }),
        new Logger({
            onChange: false
        }),
    ]
});

// Add this adapter function to convert Bun Request to Node IncomingMessage-like object
const createIncomingMessageAdapter = (request: Request): IncomingMessage => {
    // Create a minimal compatible object that satisfies the requirements
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
        headers[key] = value;
    });
    
    // Create a minimal mock Socket object. Cast to 'any' then 'Socket' 
    // to satisfy the constructor's type requirement without needing a real socket.
    const mockSocket = {
        remoteAddress: 'mock', // Provide a dummy value, Hocuspocus might not need it
        // Add other properties here if needed by IncomingMessage or Hocuspocus
    } as any as Socket; 
    
    // Pass the mock socket to the constructor
    const incomingMessage = new IncomingMessage(mockSocket);
    
    // Manually assign properties needed by Hocuspocus
    incomingMessage.headers = headers;
    incomingMessage.method = request.method;
    const url = new URL(request.url);
    incomingMessage.url = url.pathname + url.search; // Use path and query string
    
    // Hocuspocus might expect httpVersion details
    incomingMessage.httpVersion = '1.1';
    incomingMessage.httpVersionMajor = 1;
    incomingMessage.httpVersionMinor = 1;

    return incomingMessage;
};

// Helper function to set CORS headers
const setCorsHeaders = (headers: Headers) => {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
};

// Handle WebSocket connections
const handleWebSocket = (ws: any) => {
    // Hocuspocus expects a Node.js style socket and request
    // We need to cast types to make it compatible
    const data = ws.data as WebSocketData;
    const nodeRequest = createIncomingMessageAdapter(data.request);
    hocuspocusServer.handleConnection(ws, nodeRequest, {});
};

// Serve static files from the ui/dist directory
const serveStaticFile = async (path: string) => {
    const filePath = join(import.meta.dir, 'ui/dist', path);
    const file = Bun.file(filePath);
    
    try {
        if (await file.exists()) {
            return new Response(file);
        }
        
        // Try to serve index.html
        const indexPath = join(import.meta.dir, 'ui/dist/index.html');
        const indexFile = Bun.file(indexPath);
        
        if (await indexFile.exists()) {
            return new Response(indexFile);
        }
        
        // If neither the requested file nor index.html exists, return a helpful message
        const headers = new Headers();
        setCorsHeaders(headers);
        headers.set('Content-Type', 'text/plain');
        return new Response('UI files not found. The ui/dist directory may not exist.', { 
            status: 404, 
            headers 
        });
    } catch (error) {
        console.error(`Error serving static file ${path}:`, error);
        const headers = new Headers();
        setCorsHeaders(headers);
        return new Response('Error serving static files', { status: 500, headers });
    }
};

// Main Bun server
Bun.serve({
    port: serverPort,
    async fetch(req, server) {
        const url = new URL(req.url);
        const method = req.method;
        const headers = new Headers();
        
        // Set CORS headers for all responses
        setCorsHeaders(headers);
        
        // Handle preflight OPTIONS requests
        if (method === 'OPTIONS') {
            return new Response(null, { headers });
        }
        
        // Handle WebSocket upgrade for collaboration
        if (url.pathname === '/api/collaboration' && server.upgrade(req, { 
            // Store request in websocket data for handleWebSocket
            data: { request: req } as WebSocketData
        })) {
            return;
        }
        
        // API routes
        if (url.pathname === '/api/health') {
            headers.set('Content-Type', 'application/json');
            return new Response(JSON.stringify({ status: 'Healthy' }), { 
                headers 
            });
        }
        
        // GET document by read token
        if (url.pathname.startsWith('/api/') && method === 'GET' && url.pathname.split('/').length === 3) {
            const tokenRead = url.pathname.split('/')[2];
            const file = storageBucket.file(tokenRead);
            
            const [exists] = await file.exists();
            if (!exists) {
                return new Response(null, { status: 404, headers });
            }
            
            headers.set('Content-Type', 'application/json');
            
            // Read the entire file contents at once
            try {
                // Use file.download() which returns a buffer, and convert to string
                const [buffer] = await file.download();
                return new Response(buffer, { headers });
            } catch (error) {
                console.error('Error reading file:', error);
                return new Response('Error reading file', { status: 500, headers });
            }
        }
        
        // POST create new document
        if (url.pathname === '/api/' && method === 'POST') {
            try {
                const tokenWrite = uid.rnd();
                const tokenRead = uid.rnd();
                
                const file = storageBucket.file(tokenRead);
                
                const body = await req.json();
                
                await file.save(JSON.stringify(body, undefined, 2), {
                    metadata: {
                        contentType: 'application/json',
                        contentLength: undefined,
                        'write-token': tokenWrite
                    }
                });
                
                headers.set('Content-Type', 'application/json');
                return new Response(
                    JSON.stringify({ readToken: tokenRead, writeToken: tokenWrite }), 
                    { status: 201, headers }
                );
            } catch (error) {
                console.error('Error creating document:', error);
                return new Response('Error creating document', { status: 500, headers });
            }
        }
        
        // PUT update document
        if (url.pathname.startsWith('/api/') && method === 'PUT' && url.pathname.split('/').length === 4) {
            try {
                const [, , tokenRead, tokenWrite] = url.pathname.split('/');
                
                const file = storageBucket.file(tokenRead);
                
                const [exists] = await file.exists();
                if (!exists) {
                    return new Response(null, { status: 404, headers });
                }
                
                const [metadata] = await file.getMetadata();
                
                if (metadata['write-token'] !== tokenWrite) {
                    return new Response(null, { status: 403, headers });
                }
                
                const body = await req.json();
                await file.save(JSON.stringify(body, undefined, 2));
                
                headers.set('Content-Type', 'application/json');
                return new Response(
                    JSON.stringify({ readToken: tokenRead, writeToken: tokenWrite }), 
                    { status: 201, headers }
                );
            } catch (error) {
                console.error('Error updating document:', error);
                return new Response('Error updating document', { status: 500, headers });
            }
        }
        
        // Serve static files or fallback to index.html
        if (!url.pathname.startsWith('/api/')) {
            return serveStaticFile(url.pathname === '/' ? 'index.html' : url.pathname);
        }
        
        // If no route matched, return 404
        return new Response('Not Found', { status: 404, headers });
    },
    websocket: {
        // The types for Bun.serve expect a specific signature
        open: handleWebSocket,
        message: () => {},
        close: () => {}
    },
});

console.log(`Listening on http://127.0.0.1:${serverPort}`);