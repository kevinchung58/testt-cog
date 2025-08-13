import { ChromaClient, Collection } from 'chromadb';
import * as llmService from '../llmService'; // Import to mock its functions
import {
  getOrCreateCollection,
  addOrUpdateChunks,
  searchSimilarChunks,
  searchSimilarChunksWithText,
  _resetChromaClientForTesting
} from '../vectorDbService';
import { CHROMA_URL } from '../../config';

// Mock the dependencies
jest.mock('chromadb');
jest.mock('../llmService');

// Mock config
var mockChromaUrlValue = 'http://mock-chroma-url:8000';
jest.mock('../../config', () => ({
  __esModule: true,
  get CHROMA_URL() { return mockChromaUrlValue; },
}));

const mockCollectionAdd = jest.fn();
const mockCollectionQuery = jest.fn();
const mockGetOrCreateCollectionFn = jest.fn();

const mockCollection = {
  add: mockCollectionAdd,
  query: mockCollectionQuery,
} as unknown as Collection;

let mockChromaClientInstance: any;

describe('VectorDB Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // We need to require the module inside beforeEach to reset its internal state
    const vectorDbService = require('../vectorDbService');
    vectorDbService._resetChromaClientForTesting();

    mockChromaClientInstance = {
       getOrCreateCollection: mockGetOrCreateCollectionFn.mockResolvedValue(mockCollection),
    };
    (ChromaClient as jest.Mock).mockImplementation(() => mockChromaClientInstance);

    mockChromaUrlValue = 'http://mock-chroma-url:8000';
  });

  it('getOrCreateCollection should call client.getOrCreateCollection', async () => {
    const { getOrCreateCollection } = require('../vectorDbService');
    const collectionName = 'test_collection';
    await getOrCreateCollection(collectionName);
    expect(mockGetOrCreateCollectionFn).toHaveBeenCalledWith({ name: collectionName });
  });

  it('addOrUpdateChunks should call collection.add', async () => {
    const { addOrUpdateChunks } = require('../vectorDbService');
    const collectionName = 'test_collection';
    const ids = ['id1'];
    const embeddings = [[0.1]];
    const documents = ['doc1'];
    const metadatas = [{ src: 's1' }];

    await addOrUpdateChunks(collectionName, ids, embeddings, documents, metadatas);
    expect(mockGetOrCreateCollectionFn).toHaveBeenCalledWith({ name: collectionName });
    expect(mockCollectionAdd).toHaveBeenCalledWith({ ids, embeddings, documents, metadatas });
  });

  it('searchSimilarChunks should call collection.query', async () => {
    const { searchSimilarChunks } = require('../vectorDbService');
    const collectionName = 'test_collection';
    const queryEmbeddings = [[0.2]];
    const k = 3;
    mockCollectionQuery.mockResolvedValue({ documents: [['found_doc1']] });

    const result = await searchSimilarChunks(collectionName, queryEmbeddings, k);
    expect(mockGetOrCreateCollectionFn).toHaveBeenCalledWith({ name: collectionName });
    expect(mockCollectionQuery).toHaveBeenCalledWith({ queryEmbeddings, nResults: k });
    expect(result).toEqual([['found_doc1']]);
  });

  describe('searchSimilarChunksWithText', () => {
    it('should call generateEmbeddings and then searchSimilarChunks', async () => {
      const { searchSimilarChunksWithText } = require('../vectorDbService');
      const collectionName = 'text_search_collection';
      const queryTexts = ['query text'];
      const k = 2;
      const mockEmbeddings = [[0.1, 0.2, 0.3]];

      // Mock the llmService's generateEmbeddings function
      (llmService.generateEmbeddings as jest.Mock).mockResolvedValue(mockEmbeddings);

      // Mock the result of the subsequent search
      mockCollectionQuery.mockResolvedValue({ documents: [['found_doc_by_text']] });

      const result = await searchSimilarChunksWithText(collectionName, queryTexts, k);

      // Verify that we first generated embeddings for the query texts
      expect(llmService.generateEmbeddings).toHaveBeenCalledWith(queryTexts);

      // Verify that we then searched with the generated embeddings
      expect(mockGetOrCreateCollectionFn).toHaveBeenCalledWith({ name: collectionName });
      expect(mockCollectionQuery).toHaveBeenCalledWith({ queryEmbeddings: mockEmbeddings, nResults: k });

      // Verify the final result
      expect(result).toEqual([['found_doc_by_text']]);
    });

    it('should not call search if generateEmbeddings fails', async () => {
        const { searchSimilarChunksWithText } = require('../vectorDbService');
        const error = new Error('Embedding generation failed');
        (llmService.generateEmbeddings as jest.Mock).mockRejectedValue(error);

        await expect(searchSimilarChunksWithText('test_collection', ['query'], 5))
            .rejects.toThrow(error);

        expect(mockCollectionQuery).not.toHaveBeenCalled();
    });
  });
});
