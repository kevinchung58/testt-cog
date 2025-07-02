import { addDocuments, createRetriever } from '../vector-store';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';

jest.mock('@langchain/community/vectorstores/chroma');
jest.mock('@langchain/google-genai');
jest.mock('../config', () => ({
  ...jest.requireActual('../config'), // Import and retain original behavior
  GEMINI_API_KEY: 'test-gemini-api-key', // Ensure API key is present for initialization
  DEFAULT_EMBEDDING_MODEL_NAME: 'mock-embedding-model',
  CHROMA_URL: 'http://test-chroma-url:8000',
  CHROMA_COLLECTION_NAME: 'test_default_collection' // For the default collection name test
}));

describe('Vector Store Toolkit', () => {
  const mockCollectionName = 'test-collection';
  const mockDocuments = [new Document({ pageContent: 'Test content' })];
  let mockConfig: any; // To access mocked config values if needed in tests

  beforeAll(() => {
    mockConfig = require('../config'); // require it here to get the mocked version
  });
  let mockChromaInstance: Partial<Chroma>;

  beforeEach(() => {
    (GoogleGenerativeAIEmbeddings as jest.Mock).mockClear();
    (Chroma as jest.Mock).mockClear();

    mockChromaInstance = {
      addDocuments: jest.fn().mockResolvedValue(undefined),
      asRetriever: jest.fn().mockReturnValue({ /* mock retriever */ } as unknown as VectorStoreRetriever<Chroma>),
    };
    (Chroma as jest.Mock).mockImplementation(() => mockChromaInstance);
  });

  test('addDocuments should initialize Chroma and call addDocuments with configured model', async () => {
    await addDocuments(mockDocuments, mockCollectionName);
    expect(GoogleGenerativeAIEmbeddings).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: mockConfig.DEFAULT_EMBEDDING_MODEL_NAME,
    });
    expect(Chroma).toHaveBeenCalledWith(
      expect.any(GoogleGenerativeAIEmbeddings),
      { collectionName: mockCollectionName, url: mockConfig.CHROMA_URL }
    );
    expect(mockChromaInstance.addDocuments).toHaveBeenCalledWith(mockDocuments);
  });

  test('createRetriever should initialize Chroma and call asRetriever with configured model', async () => {
    const retriever = await createRetriever(mockCollectionName, 10);
    expect(GoogleGenerativeAIEmbeddings).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: mockConfig.DEFAULT_EMBEDDING_MODEL_NAME,
    });
    expect(Chroma).toHaveBeenCalled(); // Chroma instantiation is complex to assert fully without deeper mock
    expect(mockChromaInstance.asRetriever).toHaveBeenCalledWith({ k: 10 });
    expect(retriever).toBeDefined();
  });

  test('addDocuments should use default collection name from config if not provided', async () => {
    await addDocuments(mockDocuments); // No collectionName
    expect(Chroma).toHaveBeenCalledWith(
      expect.any(GoogleGenerativeAIEmbeddings),
      expect.objectContaining({ collectionName: mockConfig.CHROMA_COLLECTION_NAME })
    );
  });
});
