// Create a file store using functional approach
const createFileStore = (basePath = './localFileStore/') => {
  const base = basePath;
  const metaPath = `${base}_meta.json`;

  // Initialize the file store
  const initialize = () => {
    // Create base directory if it doesn't exist
    try {
      Bun.spawnSync(["mkdir", "-p", base]);
    } catch (e) {
      console.error("Failed to create directory:", base, e);
    }

    // Initialize metadata file if it doesn't exist
    const metaFile = Bun.file(metaPath);
    metaFile.exists().then(exists => {
      if (!exists) {
        Bun.write(metaPath, JSON.stringify({}));
      }
    });
  };

  // Create file handler function
  const file = (filePath: string) => {
    const fullPath = `${base}${filePath}`;
    const bunFile = Bun.file(fullPath);
    
    return {
      exists: async () => {
        return [await bunFile.exists()];
      },
      download: async () => {
        const buffer = await bunFile.arrayBuffer();
        return [new Uint8Array(buffer)];
      },
      createWriteStream: () => {
        return bunFile.writer();
      },
      createReadStream: () => {
        return bunFile.stream();
      },
      save: async (fileContent: string, meta?: undefined | any) => {
        if (typeof meta === 'object') {
          const metaContent = await Bun.file(metaPath).text();
          const _meta = JSON.parse(metaContent);
          _meta[fullPath] = meta.metadata;
          await Bun.write(metaPath, JSON.stringify(_meta));
        }
        await Bun.write(fullPath, fileContent);
      },
      getMetadata: async () => {
        const metaContent = await Bun.file(metaPath).text();
        const _meta = JSON.parse(metaContent);
        return [_meta[fullPath]];
      }
    };
  };

  // Run initialization
  initialize();

  // Return the public API
  return { file };
};

// Create a singleton instance
const fileStore = createFileStore();

export default fileStore;
