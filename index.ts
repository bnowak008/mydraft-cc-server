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
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

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
        return new Response('UI files not found. The ui/dist directory may not exist.', { 
            status: 404
        });
    } catch (error) {
        console.error(`Error serving static file ${path}:`, error);
        return new Response('Error serving static files', { status: 500 });
    }
};

// Create Elysia app
const app = new Elysia()
    // CORS middleware
    .use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        preflight: true
    }))
    // Basic error handler
    .onError(({ code, error, set }) => {
        console.error(`Error [${code}]:`, error);
        set.status = 500;
        // Check if error has a message property before trying to access it
        return { 
            error: 'Internal Server Error', 
            details: error && typeof error === 'object' && 'message' in error 
                ? error.message as string 
                : 'Unknown error'
        };
    });

// Health check endpoint
app.get('/api/health', () => {
    return { status: 'Healthy' };
});

// Get document by read token
app.get('/api/:tokenRead', async ({ params, set }) => {
    const tokenRead = params.tokenRead;
    const file = storageBucket.file(tokenRead);
    
    const [exists] = await file.exists();
    if (!exists) {
        set.status = 404;
        return { error: 'Document not found' };
    }
    
    try {
        // Use file.download() which returns a buffer
        const [buffer] = await file.download();
        
        // Set content type
        set.headers['Content-Type'] = 'application/json';
        
        // Return the buffer directly
        return buffer;
    } catch (error) {
        console.error('Error reading file:', error);
        set.status = 500;
        return { error: 'Error reading file' };
    }
});

// Create new document
app.post('/api/', async ({ body, set }) => {
    try {
        const tokenWrite = uid.rnd();
        const tokenRead = uid.rnd();
        
        const file = storageBucket.file(tokenRead);
        
        await file.save(JSON.stringify(body, undefined, 2), {
            metadata: {
                contentType: 'application/json',
                contentLength: undefined,
                'write-token': tokenWrite
            }
        });
        
        set.status = 201;
        set.headers['Content-Type'] = 'application/json';
        return { readToken: tokenRead, writeToken: tokenWrite };
    } catch (error) {
        console.error('Error creating document:', error);
        set.status = 500;
        return { error: 'Error creating document' };
    }
});

// Update document
app.put('/api/:tokenRead/:tokenWrite', async ({ params, body, set }) => {
    try {
        const { tokenRead, tokenWrite } = params;
        
        const file = storageBucket.file(tokenRead);
        
        const [exists] = await file.exists();
        if (!exists) {
            set.status = 404;
            return { error: 'Document not found' };
        }
        
        const [metadata] = await file.getMetadata();
        
        if (metadata['write-token'] !== tokenWrite) {
            set.status = 403;
            return { error: 'Invalid write token' };
        }
        
        await file.save(JSON.stringify(body, undefined, 2));
        
        return { readToken: tokenRead, writeToken: tokenWrite };
    } catch (error) {
        console.error('Error updating document:', error);
        set.status = 500;
        return { error: 'Error updating document' };
    }
});

// WebSocket handler for collaboration
app.ws('/api/collaboration', {
    open(ws) {
        try {
            // Instead of accessing ws.url directly, create a URL from the connection info
            // Elysia's WebSocket doesn't expose the full URL directly like Bun's native WebSocket
            // We can use a dummy URL since Hocuspocus mainly needs the headers and request details
            const request = new Request('http://localhost/api/collaboration');
            
            // Use the adapter to convert to IncomingMessage
            const nodeRequest = createIncomingMessageAdapter(request);
            
            // Pass to Hocuspocus
            hocuspocusServer.handleConnection(ws as any, nodeRequest, {});
        } catch (error) {
            console.error('Error in WebSocket open handler:', error);
            ws.close();
        }
    },
    message() {
        // Hocuspocus handles this internally after connection
    },
    close() {
        // Hocuspocus handles this internally
    }
});

// Serve static files for any non-API route
app.all('/*', async ({ path, set }) => {
    if (path.startsWith('/api/')) {
        set.status = 404;
        return { error: 'Not Found' };
    }
    
    return await serveStaticFile(path === '/' ? 'index.html' : path);
});

// Start the server
app.listen(serverPort);

console.log(`🦊 Elysia server running on http://localhost:${serverPort}`);