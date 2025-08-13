/* eslint-disable @typescript-eslint/no-var-requires */
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { SPOTriple } from '../llmService';

// Mock the core dependencies
jest.mock('@langchain/google-genai');
jest.mock('@langchain/core/prompts');
jest.mock('@langchain/core/output_parsers');

// Control the API key for testing purposes
let mockGeminiApiKey: string | undefined = 'test-gemini-api-key';
jest.mock('../../config', () => ({
  __esModule: true,
  get GEMINI_API_KEY() {
    return mockGeminiApiKey;
  },
  DEFAULT_CHAT_MODEL_NAME: 'mock-chat-model',
  DEFAULT_EMBEDDING_MODEL_NAME: 'mock-embedding-model',
}));

// Prepare mock instances
const mockChatModelInstance = {
  invoke: jest.fn(),
  pipe: jest.fn(), // We will configure this in tests
  stream: jest.fn(),
};

const mockEmbeddingsInstance = {
  embedDocuments: jest.fn(),
};

const mockChain = {
    invoke: jest.fn(),
    pipe: jest.fn(),
    stream: jest.fn(),
};


describe('LLM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (ChatGoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => mockChatModelInstance);
    (GoogleGenerativeAIEmbeddings as unknown as jest.Mock).mockImplementation(() => mockEmbeddingsInstance);

    // This mock allows for chaining: prompt.pipe(llm).pipe(parser)
    const promptPipe = jest.fn().mockReturnValue(mockChain);
    (ChatPromptTemplate.fromMessages as jest.Mock).mockReturnValue({
      pipe: promptPipe,
    });

    // Ensure the chain itself can be piped
    mockChain.pipe.mockReturnValue(mockChain);
  });

  describe('extractSPO', () => {
    it('should call Gemini API and return parsed SPO triples', async () => {
      const mockLLMResponse: SPOTriple[] = [{ subject: 'S', relation: 'R', object: 'O' }];
      mockChatModelInstance.invoke.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
      });

      const { extractSPO } = require('../llmService');
      const result = await extractSPO('Some text');

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(expect.objectContaining({
        apiKey: 'test-gemini-api-key',
      }));
      expect(mockChatModelInstance.invoke).toHaveBeenCalledWith(expect.any(Array));
      expect(result).toEqual(mockLLMResponse);
    });
  });

  describe('generateEmbeddings', () => {
    // No jest.resetModules() here to avoid issues with mocks
    beforeEach(() => {
        mockGeminiApiKey = 'test-gemini-api-key';
        // Manually reset module state if necessary, but prefer not to.
    });

    it('should generate embeddings for given texts', async () => {
      const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];
      mockEmbeddingsInstance.embedDocuments.mockResolvedValue(mockEmbeddings);

      const { generateEmbeddings } = require('../llmService');
      const result = await generateEmbeddings(['text1', 'text2']);

      // The constructor is called when the module is loaded.
      // Since we are not resetting modules, this check might be tricky if other tests also load it.
      // A better check is on the instance's method.
      expect(mockEmbeddingsInstance.embedDocuments).toHaveBeenCalledWith(['text1', 'text2']);
      expect(result).toEqual(mockEmbeddings);
    });

    it('should handle API errors and return mock embeddings', async () => {
      // This is the key change: make the mock reject to test the catch block
      mockEmbeddingsInstance.embedDocuments.mockRejectedValue(new Error('Embedding API Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { generateEmbeddings } = require('../llmService');
      const result = await generateEmbeddings(['text1']);

      expect(result[0]).toEqual(Array(768).fill(0.0));
      // Check for the correct error message from the catch block
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error calling Gemini embeddings API via Langchain:', 'Embedding API Error', expect.any(String));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('generateCypherQuery', () => {
    beforeEach(() => {
        mockGeminiApiKey = 'test-gemini-api-key';
        jest.resetModules(); // Reset is needed here to re-initialize the LLM with the key

        // Re-mock after reset
        const promptPipe = jest.fn().mockReturnValue(mockChain);
        (require('@langchain/core/prompts').ChatPromptTemplate.fromMessages as jest.Mock).mockReturnValue({
            pipe: promptPipe,
        });
    });

    it('should call the chain and return a cleaned cypher query', async () => {
        const rawQuery = '```cypher\nMATCH (n) RETURN n;\n```';
        const cleanedQuery = 'MATCH (n) RETURN n';

        // The final chain object's invoke method is called
        mockChain.invoke.mockResolvedValue(rawQuery);

        const { generateCypherQuery } = require('../llmService');
        const result = await generateCypherQuery('A question', 'A schema');

        expect(mockChain.invoke).toHaveBeenCalledWith(expect.any(Object));
        expect(result).toBe(cleanedQuery);
    });
  });

  describe('synthesizeAnswerWithContext', () => {
    beforeEach(() => {
        mockGeminiApiKey = 'test-gemini-api-key';
        jest.resetModules(); // Reset is needed here to re-initialize the LLM with the key

        // Re-mock after reset
        const promptPipe = jest.fn().mockReturnValue(mockChain);
        (require('@langchain/core/prompts').ChatPromptTemplate.fromMessages as jest.Mock).mockReturnValue({
            pipe: promptPipe,
        });
    });

    async function* createMockStream(chunks: string[]) {
        for (const chunk of chunks) {
            yield chunk;
        }
    }

    it('should stream the response from the LLM', async () => {
        const responseChunks = ['This', ' is', ' a', ' test.'];

        // The final chain object's stream method is called
        mockChain.stream.mockResolvedValue(createMockStream(responseChunks));

        const { synthesizeAnswerWithContext } = require('../llmService');
        const stream = await synthesizeAnswerWithContext('A question', ['A context']);

        const result: string[] = [];
        for await (const token of stream) {
            result.push(token);
        }

        expect(mockChain.stream).toHaveBeenCalledWith(expect.any(Object));
        expect(result.join('')).toBe('This is a test.');
    });
  });
});
