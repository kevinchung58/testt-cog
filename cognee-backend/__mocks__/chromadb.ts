// Manual mock for the 'chromadb' package.
console.log('JEST: Using manual mock for chromadb.');

const mockCollection = {
  add: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockResolvedValue({ ids: [], embeddings: [], metadatas: [], documents: [] }),
  query: jest.fn().mockResolvedValue({ ids: [[]], embeddings: [[]], metadatas: [[]], documents: [[]], distances: [[]] }),
  peek: jest.fn().mockResolvedValue({ ids: [], embeddings: [], metadatas: [], documents: [] }),
  count: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockResolvedValue([]),
};

const mockClient = {
  getOrCreateCollection: jest.fn().mockResolvedValue(mockCollection),
  getCollection: jest.fn().mockResolvedValue(mockCollection),
  deleteCollection: jest.fn().mockResolvedValue({}),
  listCollections: jest.fn().mockResolvedValue([]),
  reset: jest.fn().mockResolvedValue(true),
  // Add any other methods your code uses
};

export const ChromaClient = jest.fn(() => mockClient);

export default {
  ChromaClient,
};
