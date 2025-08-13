import { createRAGChain, createConversationalChain } from '../query-engine';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RetrievalQAChain, ConversationalRetrievalQAChain } from 'langchain/chains';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';

jest.mock('@langchain/google-genai');
jest.mock('langchain/chains');
jest.mock('../config', () => ({
  ...jest.requireActual('../config'),
  GEMINI_API_KEY: 'test-gemini-api-key',
  DEFAULT_CHAT_MODEL_NAME: 'mock-chat-model',
}));

describe('Query Engine Toolkit', () => {
  let mockRetriever: VectorStoreRetriever;
  let mockConfig: any;

  beforeAll(() => {
    mockConfig = require('../config');
  });

  beforeEach(() => {
    (ChatGoogleGenerativeAI as unknown as jest.Mock).mockClear();
    (RetrievalQAChain.fromLLM as unknown as jest.Mock).mockClear();
    (ConversationalRetrievalQAChain.fromLLM as unknown as jest.Mock).mockClear();

    mockRetriever = {} as VectorStoreRetriever; // Simple mock

    // Mock the static fromLLM methods
    (RetrievalQAChain.fromLLM as jest.Mock).mockReturnValue({ /* mock chain */ });
    (ConversationalRetrievalQAChain.fromLLM as jest.Mock).mockReturnValue({ /* mock chain */ });
  });

  test('createRAGChain should initialize LLM with configured model and create RetrievalQAChain', () => {
    createRAGChain(mockRetriever);
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: mockConfig.DEFAULT_CHAT_MODEL_NAME,
      temperature: 0.3, // Matching default temperature in query-engine.ts
    });
    expect(RetrievalQAChain.fromLLM).toHaveBeenCalledWith(
      expect.any(ChatGoogleGenerativeAI),
      mockRetriever,
      expect.objectContaining({ returnSourceDocuments: true })
    );
  });

  test('createRAGChain should use provided chatModelName when creating LLM', () => {
    const specificModel = 'gemini-ultra-fast';
    createRAGChain(mockRetriever, specificModel);
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: specificModel,
      temperature: 0.3,
    });
  });

  test('createConversationalChain should initialize LLM with configured model and create ConversationalRetrievalQAChain', () => {
    createConversationalChain(mockRetriever);
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: mockConfig.DEFAULT_CHAT_MODEL_NAME,
      temperature: 0.3, // Matching default temperature in query-engine.ts
    });
    expect(ConversationalRetrievalQAChain.fromLLM).toHaveBeenCalledWith(
      expect.any(ChatGoogleGenerativeAI),
      mockRetriever,
      expect.objectContaining({ returnSourceDocuments: true })
    );
  });

  test('createConversationalChain should use provided chatModelName when creating LLM', () => {
    const specificModel = 'gemini-ultra-contextual';
    createConversationalChain(mockRetriever, specificModel);
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: mockConfig.GEMINI_API_KEY,
      modelName: specificModel,
      temperature: 0.3,
    });
  });
});
