// Placeholder for /query endpoint tests
import request from 'supertest';
import express from 'express';
// Import mocks and app similar to the original server.integration.test.ts
// For now, this is a basic structure.

// Mock the toolkit functions that server.ts routes directly depend on
jest.mock('../toolkit/graph-builder', () => {
  const actual = jest.requireActual('../toolkit/graph-builder');
  return {
    ...actual,
    getGraphOverview: jest.fn(),
    getNodeWithNeighbors: jest.fn(),
    fetchGraphSchemaSummary: jest.fn(),
    queryGraph: jest.fn(),
    documentsToGraph: jest.fn(),
    saveChatMessage: jest.fn(),
    getChatHistory: jest.fn(),
    deleteChatHistory: jest.fn(),
    saveUserPrompt: jest.fn(),
    getSavedPrompts: jest.fn(),
    deleteSavedPrompt: jest.fn()
  };
});

jest.mock('../toolkit/query-engine', () => ({
  createRAGChain: jest.fn(),
  createConversationalChain: jest.fn(),
}));

jest.mock('../toolkit/vector-store', () => ({
  ...jest.requireActual('../toolkit/vector-store'),
  createRetriever: jest.fn(),
  addDocuments: jest.fn(),
}));

jest.mock('../toolkit/data-processor', () => ({
  ...jest.requireActual('../toolkit/data-processor'),
  processFileToDocuments: jest.fn(),
}));


let app: express.Application;
try {
  const serverModule = require('../server');
  app = serverModule.app;
  if (!app) throw new Error("App not exported from server.ts");
} catch (e) {
  console.error("Failed to import app from server.ts for testing in query.integration.test.ts", e);
  process.exit(1);
}

import { createRAGChain, createConversationalChain } from '../toolkit/query-engine';
import { createRetriever as createVectorStoreRetriever } from '../toolkit/vector-store';
// queryGraph is also used by /query if use_knowledge_graph is true
import { queryGraph as queryKnowledgeGraphService } from '../toolkit/graph-builder';


describe('API Endpoints - POST /query', () => {
  let mockRagChain: any;
  let mockConversationalChain: any;
  let mockRetriever: any;
  let mockQueryGraph: vi.Mock;


  beforeEach(() => {
    // Reset mocks for /query endpoint dependencies
    (createRAGChain as jest.Mock).mockReset();
    (createConversationalChain as jest.Mock).mockReset();
    (createVectorStoreRetriever as jest.Mock).mockReset();

    // graph-builder is already mocked at the top level. Get the specific function.
    mockQueryGraph = jest.requireMock('../toolkit/graph-builder').queryGraph;
    mockQueryGraph.mockReset();


    // Mock implementations for chains and retriever
    mockRetriever = { /* mock retriever methods if any are called directly */ };
    (createVectorStoreRetriever as jest.Mock).mockResolvedValue(mockRetriever);

    const mockStream = async function* (data: any) {
      yield { token: 'Mocked stream response for ' + (data.question || data.query) }; // data.query for RAGChain
      yield { token: ' part 2.'};
    };

    const mockStreamConversational = async function* (data: any) {
      yield { answer: 'Mocked conversational stream for ' + data.question };
      yield { answer: ' part 2.'};
    };

    mockRagChain = { stream: jest.fn().mockImplementation(mockStream), call: jest.fn().mockResolvedValue({text: "Final RAG answer", sourceDocuments: []}) };
    mockConversationalChain = { stream: jest.fn().mockImplementation(mockStreamConversational) };

    (createRAGChain as jest.Mock).mockReturnValue(mockRagChain);
    (createConversationalChain as jest.Mock).mockReturnValue(mockConversationalChain);
  });

  it('should return a 200 OK with a streamed answer for a valid question (basic RAG)', async () => {
    const mockQuestion = 'What is the meaning of life?';

    const response = await request(app)
      .post('/query')
      .send({ question: mockQuestion })
      .expect('Content-Type', /text\/event-stream/)
      .expect(200);

    expect(response.text).toContain('data: {"token":"Mocked stream response for What is the meaning of life?"}');
    expect(response.text).toContain('data: {"token":" part 2."}');
    expect(response.text).toContain('data: {"type":"completed","message":"Query processing completed."}');
    expect(createVectorStoreRetriever).toHaveBeenCalled();
    expect(createRAGChain).toHaveBeenCalledWith(mockRetriever);
    expect(mockRagChain.stream).toHaveBeenCalledWith({ query: mockQuestion });
  });

  it('should use conversational chain if chat_history is provided', async () => {
      const mockQuestion = "And what about dogs?";
      const chatHistory = [{type: "human", content: "Tell me about cats." }, {type: "ai", content: "Cats are great."}];

      await request(app)
          .post('/query')
          .send({ question: mockQuestion, chat_history: chatHistory })
          .expect(200);

      expect(createConversationalChain).toHaveBeenCalled();
      expect(mockConversationalChain.stream).toHaveBeenCalled();
  });

  it('should call queryKnowledgeGraph if use_knowledge_graph is true', async () => {
      const mockQuestion = "Query with KG";
      mockQueryGraph.mockResolvedValue([{ someData: "from graph" }]);

      const response = await request(app)
          .post('/query')
          .send({ question: mockQuestion, use_knowledge_graph: true })
          .expect(200);

      expect(mockQueryGraph).toHaveBeenCalledWith(mockQuestion);
      expect(response.text).toContain('data: {"type":"kg_context","content":"Knowledge Graph Results:\\n{\\"someData\\":\\"from graph\\"}"}');
  });

  it('should return a 400 error if question is missing', async () => {
    const response = await request(app)
      .post('/query')
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);
    expect(response.body.message).toContain('question is required');
  });

  it('should return a 400 error if question is not a string', async () => {
    const response = await request(app)
      .post('/query')
      .send({ question: 123 })
      .expect('Content-Type', /json/)
      .expect(400);
    expect(response.body.message).toContain('question is required and must be a string');
  });

  it('should return a 500 error if chain creation or stream fails', async () => {
    const mockQuestion = 'A failing question';
    (createVectorStoreRetriever as jest.Mock).mockRejectedValue(new Error('Internal service failure'));

    const response = await request(app)
      .post('/query')
      .send({ question: mockQuestion })
      .expect('Content-Type', /application\/json/)
      .expect(500);
    expect(response.body.message).toContain('Error processing your query');
  });
});
