export const utils = {
    // Write data to a stream (works with both Bun WritableStream and Node Writable)
    writeAsync: async (stream: any, chunk: any) => {
        // If it's a Bun WritableStream with a write method
        if (typeof stream.write === 'function') {
            return new Promise((resolve, reject) => {
                stream.write(chunk, (error?: Error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
        } 
        // Fallback to standard approach for other stream types
        else {
            const writer = stream.getWriter();
            await writer.write(chunk);
            writer.releaseLock();
            return true;
        }
    },

    // End a stream (works with both Bun WritableStream and Node Writable)
    endAsync: async (stream: any) => {
        // If it's a Node-style stream with an end method
        if (typeof stream.end === 'function') {
            return new Promise((resolve) => {
                stream.end(undefined, () => {
                    resolve(true);
                });
            });
        } 
        // If it's a Bun or web standard WritableStream
        else {
            const writer = stream.getWriter();
            await writer.close();
            return true;
        }
    }
}
