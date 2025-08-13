import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';

// Define variables to hold mocks and modules in the suite's scope
// These will be re-assigned in beforeEach for each test.
let ChromaMock: jest.Mock;
let GoogleGenerativeAIEmbeddingsMock: jest.Mock;
let addDocuments: (documents: Document[], collectionName?: string) => Promise<void>;
let createRetriever: (collectionName?: string, k?: number) => Promise<VectorStoreRetriever<Chroma>>;
let mockConfig: any;
let mockChromaInstance: {
  addDocuments: jest.Mock,
  asRetriever: jest.Mock,
};

describe('Vector Store Toolkit', () => {
  const mockCollectionName = 'test-collection';
  const mockDocuments = [new Document({ pageContent: 'Test content' })];

  beforeEach(() => {
    // Reset modules before each test to get a fresh instance of vector-store and its dependencies
    jest.resetModules();

    // Re-mock dependencies after reset
    jest.mock('@langchain/community/vectorstores/chroma');
    jest.mock('@langchain/google-genai');
    jest.mock('../../config', () => ({
      __esModule: true,
      GEMINI_API_KEY: 'test-gemini-api-key',
      DEFAULT_EMBEDDING_MODEL_NAME: 'mock-embedding-model',
      CHROMA_URL: 'http://test-chroma-url:8000',
      CHROMA_COLLECTION_NAME: 'test_default_collection',
    }));

    // Re-require the mocked modules and the module under test
    ChromaMock = require('@langchain/community/vectorstores/chroma').Chroma;
    GoogleGenerativeAIEmbeddingsMock = require('@langchain/google-genai').GoogleGenerativeAIEmbeddings;
    mockConfig = require('../../config');

    // Setup mock implementations for this test
    mockChromaInstance = {
      addDocuments: jest.fn().mockResolvedValue(undefined),
      asRetriever: jest.fn().mockReturnValue({} as unknown as VectorStoreRetriever<Chroma>),
    };
    (ChromaMock as jest.Mock).mockImplementation(() => mockChromaInstance);

    // Re-require the functions to test
    const vectorStoreModule = require('../vector-store');
    addDocuments = vectorStoreModule.addDocuments;
    createRetriever = vectorStoreModule.createRetriever;
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('addDocuments should initialize Chroma and call addDocuments with configured model', async () => {
    await addDocuments(mockDocuments, mockCollectionName);

    expect(GoogleGenerativeAIEmbeddingsMock).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: mockConfig.DEFAULT_EMBEDDING_MODEL_NAME,
    });
    expect(ChromaMock).toHaveBeenCalledWith(
      expect.any(GoogleGenerativeAIEmbeddingsMock),
      { collectionName: mockCollectionName, url: mockConfig.CHROMA_URL }
    );
    expect(mockChromaInstance.addDocuments).toHaveBeenCalledWith(mockDocuments);
  });

  test('createRetriever should initialize Chroma and call asRetriever with configured model', async () => {
    const retriever = await createRetriever(mockCollectionName, 10);

    expect(GoogleGenerativeAIEmbeddingsMock).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: mockConfig.DEFAULT_EMBEDDING_MODEL_NAME,
    });
    expect(mockChromaInstance.asRetriever).toHaveBeenCalledWith({ k: 10 });
    expect(retriever).toBeDefined();
  });

  test('addDocuments should use default collection name from config if not provided', async () => {
    await addDocuments(mockDocuments); // No collectionName
    expect(ChromaMock).toHaveBeenCalledWith(
      expect.any(GoogleGenerativeAIEmbeddingsMock),
      expect.objectContaining({ collectionName: mockConfig.CHROMA_COLLECTION_NAME })
    );
  });
});
