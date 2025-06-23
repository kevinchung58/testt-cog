import request from 'supertest';
import express from 'express'; // Import express to type 'app' if not already available globally
import { getGraphOverview, getNodeWithNeighbors } from '../toolkit/graph-builder';
import { createRAGChain, createConversationalChain } from '../toolkit/query-engine';
import { createRetriever as createVectorStoreRetriever } from '../toolkit/vector-store';

// Mock the toolkit functions that server.ts routes directly depend on
jest.mock('../toolkit/graph-builder', () => ({
  ...jest.requireActual('../toolkit/graph-builder'), // Import and retain original functions not explicitly mocked
  getGraphOverview: jest.fn(),
  getNodeWithNeighbors: jest.fn(),
  // fetchNeo4jGraphSchema is used by /graph-schema, can be mocked if specific return needed for other tests
  fetchGraphSchemaSummary: jest.fn(), // Also aliased as fetchNeo4jGraphSchema in server.ts imports
  queryGraph: jest.fn(), // for /query-graph
}));

jest.mock('../toolkit/query-engine', () => ({
  createRAGChain: jest.fn(),
  createConversationalChain: jest.fn(),
}));

import { processFileToDocuments } from '../toolkit/data-processor';

jest.mock('../toolkit/vector-store', () => ({
  ...jest.requireActual('../toolkit/vector-store'),
  createRetriever: jest.fn(),
  addDocuments: jest.fn(), // Mock for /ingest: addDocumentsToVectorStore is an alias
}));

jest.mock('../toolkit/data-processor', () => ({
  ...jest.requireActual('../toolkit/data-processor'),
  processFileToDocuments: jest.fn(),
}));

// Update graph-builder mock to include documentsToGraph for /ingest
jest.mock('../toolkit/graph-builder', () => {
  const actual = jest.requireActual('../toolkit/graph-builder');
  return {
    ...actual,
    getGraphOverview: jest.fn(),
    getNodeWithNeighbors: jest.fn(),
    fetchGraphSchemaSummary: jest.fn(),
    queryGraph: jest.fn(),
    documentsToGraph: jest.fn(), // Mock for /ingest
  };
});


// We need to import the app from server.ts.
// However, server.ts starts the server by calling app.listen().
// For integration tests with supertest, we need the 'app' instance without it already listening.
// This typically requires refactoring server.ts to export 'app' before calling 'listen',
// or having a separate app.ts and server.ts (where server.ts imports app from app.ts and calls listen).

// Assuming a refactor where 'app' can be imported (e.g., app.ts exports app, server.ts imports and listens):
// For now, let's proceed as if 'app' can be imported. If server.ts execution causes issues,
// this part of the test will highlight it.
// Due to the current structure of server.ts (app.listen is top-level),
// importing it directly will try to start the server, which can lead to EADDRINUSE errors in tests.
// This is a common challenge. The "solution" for this test would be to conditionally export app
// or restructure. For this subtask, I will write the test as if app is exportable.

// Placeholder: server.ts would need to be refactored to export app, e.g.
// let server; const app = express(); ... export { app, server };
// if (require.main === module) { server = app.listen(...); }
// For now, we'll mock the app listener for tests.

let app: express.Application;
let serverListenSpy: jest.SpyInstance;


// Attempt to import app and prevent server from actually listening
// This is a common pattern: server.ts exports app, and conditionally calls listen()
// e.g. if (require.main === module) { app.listen(...) }
// For this setup, we assume server.ts can be imported without auto-listening in test env.
try {
  const serverModule = require('../server');
  app = serverModule.app; // Assuming server.ts exports app
  if (!app) throw new Error("App not exported from server.ts");
} catch (e) {
  console.error("Failed to import app from server.ts for testing.", e);
  console.error("Please ensure server.ts exports 'app' and does not unconditionally call app.listen().");
  process.exit(1); // Exit if app cannot be loaded for tests
}


describe('API Endpoints', () => {
  // General beforeAll/afterAll for server if needed, e.g. for DB connections for true integration tests
  // For now, toolkit functions are mocked, so DB is not directly hit by these tests.

  describe('POST /query', () => {
    let mockRagChain: any;
    let mockConversationalChain: any;
    let mockRetriever: any;

    beforeEach(() => {
      // Reset mocks for /query endpoint dependencies
      (createRAGChain as jest.Mock).mockReset();
      (createConversationalChain as jest.Mock).mockReset();
      (createVectorStoreRetriever as jest.Mock).mockReset();
      // queryGraph from graph-builder might be called if use_knowledge_graph is true
      (jest.requireMock('../toolkit/graph-builder').queryGraph as jest.Mock).mockReset();


      // Mock implementations for chains and retriever
      mockRetriever = { /* mock retriever methods if any are called directly */ };
      (createVectorStoreRetriever as jest.Mock).mockResolvedValue(mockRetriever);

      // Mock the stream method for chains
      const mockStream = async function* (data: any) {
        yield { token: 'Mocked stream response for ' + data.question };
        yield { token: ' part 2.'};
        // Simulate source documents if your chain provides them
        // yield { sourceDocuments: [{ pageContent: "Source doc 1", metadata: {} }] };
      };

      const mockStreamConversational = async function* (data: any) {
        yield { answer: 'Mocked conversational stream for ' + data.question };
        yield { answer: ' part 2.'};
      };

      mockRagChain = { stream: jest.fn().mockImplementation(mockStream) };
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

      // Check streamed content (simplified check)
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
        const kgMock = jest.requireMock('../toolkit/graph-builder').queryGraph;
        kgMock.mockResolvedValue([{ someData: "from graph" }]);

        await request(app)
            .post('/query')
            .send({ question: mockQuestion, use_knowledge_graph: true })
            .expect(200);

        expect(kgMock).toHaveBeenCalledWith(mockQuestion);
        // Check that the response text includes the KG context event (if your stream setup sends it)
        // For this, we'd need to inspect response.text for '{"type":"kg_context",...}'
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

    // We expect a 500, but since it's a stream, the headers might be sent before error.
    // Supertest might not handle SSE error streaming very well.
    // The server sends a JSON error if headers not sent, or tries to write to stream.
    // Let's assume it sends JSON error before stream starts for this mock.
    const response = await request(app)
      .post('/query')
      .send({ question: mockQuestion })
      .expect('Content-Type', /application\/json/) // Expect JSON error if error before stream
      .expect(500);

    expect(response.body.message).toContain('Error processing your query');
    // Note: The actual error message might vary based on where it's caught in server.ts
  });
});


describe('GET /graph/overview', () => {
  const mockGraphData = { nodes: [{id: '1', name: 'Node1'}], links: [] };

  beforeEach(() => {
    (getGraphOverview as jest.Mock).mockReset();
  });

  it('should return 200 with graph data', async () => {
    (getGraphOverview as jest.Mock).mockResolvedValue(mockGraphData);
    const response = await request(app)
      .get('/graph/overview')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body).toEqual(mockGraphData);
    expect(getGraphOverview).toHaveBeenCalledWith(undefined, 50); // Default limit
  });

  it('should pass searchTerm and limit to getGraphOverview', async () => {
    (getGraphOverview as jest.Mock).mockResolvedValue(mockGraphData);
    await request(app)
      .get('/graph/overview?searchTerm=test&limit=10')
      .expect(200);
    expect(getGraphOverview).toHaveBeenCalledWith('test', 10);
  });

  it('should return 400 for invalid limit parameter', async () => {
    const response = await request(app)
      .get('/graph/overview?limit=invalid')
      .expect('Content-Type', /json/)
      .expect(400);
    expect(response.body.message).toContain('Invalid limit parameter');
  });

  it('should return 500 if getGraphOverview fails', async () => {
    (getGraphOverview as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    const response = await request(app)
      .get('/graph/overview')
      .expect('Content-Type', /json/)
      .expect(500);
    expect(response.body.message).toContain('Failed to fetch graph overview.');
  });
});

describe('GET /graph/node/:id/neighbors', () => {
  const mockNodeId = 'node123';
  const mockNeighborData = { nodes: [{id: mockNodeId, name: 'Center'}, {id: 'n2', name: 'Neighbor'}], links: [{source: mockNodeId, target: 'n2'}] };

  beforeEach(() => {
    (getNodeWithNeighbors as jest.Mock).mockReset();
  });

  it('should return 200 with neighbor data for a valid node ID', async () => {
    (getNodeWithNeighbors as jest.Mock).mockResolvedValue(mockNeighborData);
    const response = await request(app)
      .get(`/graph/node/${mockNodeId}/neighbors`)
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body).toEqual(mockNeighborData);
    expect(getNodeWithNeighbors).toHaveBeenCalledWith(mockNodeId);
  });

  it('should return 404 if getNodeWithNeighbors returns empty data (node not found)', async () => {
    (getNodeWithNeighbors as jest.Mock).mockResolvedValue({ nodes: [], links: [] });
    const response = await request(app)
      .get(`/graph/node/nonexistent/neighbors`)
      .expect('Content-Type', /json/)
      .expect(404);
    expect(response.body.message).toContain('not found or has no connections');
  });

  it('should return 500 if getNodeWithNeighbors fails', async () => {
    (getNodeWithNeighbors as jest.Mock).mockRejectedValue(new Error('DB error'));
    const response = await request(app)
      .get(`/graph/node/${mockNodeId}/neighbors`)
      .expect('Content-Type', /json/)
      .expect(500);
    expect(response.body.message).toContain(`Failed to fetch neighbors for node ${mockNodeId}`);
  });
});

// TODO: Add tests for /ingest and /graph-schema if time permits or as a follow-up.
// These tests would require mocking 'multer' for file uploads, 'fs' for file operations,
// and the relevant toolkit functions (processFileToDocuments, addDocumentsToVectorStore, documentsToGraph for /ingest;
// fetchNeo4jGraphSchema for /graph-schema).

describe('GET /graph-schema', () => {
  const mockSchema = { nodeLabels: ['Person', 'Document'], relationshipTypes: ['APPEARS_IN'] };
  let fetchGraphSchemaSummaryMock: jest.Mock;


  beforeEach(() => {
    // graph-builder is already mocked. We need to get the specific mock function.
    fetchGraphSchemaSummaryMock = jest.requireMock('../toolkit/graph-builder').fetchGraphSchemaSummary;
    fetchGraphSchemaSummaryMock.mockReset();
  });

  it('should return 200 with graph schema summary', async () => {
    fetchGraphSchemaSummaryMock.mockResolvedValue(mockSchema);
    const response = await request(app)
      .get('/graph-schema')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual(mockSchema);
    expect(fetchGraphSchemaSummaryMock).toHaveBeenCalled();
  });

  it('should return 500 if fetchGraphSchemaSummary fails', async () => {
    fetchGraphSchemaSummaryMock.mockRejectedValue(new Error('Schema fetch failed'));
    const response = await request(app)
      .get('/graph-schema')
      .expect('Content-Type', /json/)
      .expect(500);
    expect(response.body.message).toContain('Failed to fetch graph schema');
  });
});

describe('POST /ingest', () => {
  let processFileToDocumentsMock: jest.Mock;
  let addDocumentsToVectorStoreMock: jest.Mock;
  let documentsToGraphMock: jest.Mock;

  beforeEach(() => {
    processFileToDocumentsMock = jest.requireMock('../toolkit/data-processor').processFileToDocuments;
    addDocumentsToVectorStoreMock = jest.requireMock('../toolkit/vector-store').addDocuments;
    documentsToGraphMock = jest.requireMock('../toolkit/graph-builder').documentsToGraph;

    processFileToDocumentsMock.mockReset();
    addDocumentsToVectorStoreMock.mockReset();
    documentsToGraphMock.mockReset();
  });

  it('should return 200 and process file when a file is uploaded', async () => {
    const mockDocuments = [{ pageContent: 'Test content', metadata: {} }];
    processFileToDocumentsMock.mockResolvedValue(mockDocuments);
    addDocumentsToVectorStoreMock.mockResolvedValue(undefined);
    documentsToGraphMock.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/ingest')
      .attach('file', Buffer.from('test content'), 'test.txt') // supertest .attach() for file uploads
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.message).toContain('File ingested successfully');
    expect(response.body.documentsProcessed).toBe(mockDocuments.length);
    expect(processFileToDocumentsMock).toHaveBeenCalled();
    expect(addDocumentsToVectorStoreMock).toHaveBeenCalledWith(mockDocuments, expect.any(String)); // Default collection name
    expect(documentsToGraphMock).toHaveBeenCalledWith(mockDocuments); // Default buildGraph=true
  });

  it('should skip graph building if buildGraph=false query param is passed', async () => {
    processFileToDocumentsMock.mockResolvedValue([{ pageContent: 'Test content', metadata: {} }]);
    addDocumentsToVectorStoreMock.mockResolvedValue(undefined);
     // documentsToGraphMock should not be called

    await request(app)
      .post('/ingest?buildGraph=false')
      .attach('file', Buffer.from('test content'), 'test.txt')
      .expect(200);

    expect(documentsToGraphMock).not.toHaveBeenCalled();
  });

  it('should return 400 if no file is uploaded', async () => {
    const response = await request(app)
      .post('/ingest')
      .expect('Content-Type', /json/)
      .expect(400);
    expect(response.body.message).toContain('No file uploaded');
  });

  it('should return 400 if file processing yields no documents', async () => {
    processFileToDocumentsMock.mockResolvedValue([]); // Simulate no documents extracted

    const response = await request(app)
      .post('/ingest')
      .attach('file', Buffer.from('empty or unreadable'), 'test.txt')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.message).toContain('File processed, but no content could be extracted');
  });

  it('should return 500 if processFileToDocuments fails', async () => {
    processFileToDocumentsMock.mockRejectedValue(new Error('Processing error'));
    const response = await request(app)
      .post('/ingest')
      .attach('file', Buffer.from('test content'), 'test.txt')
      .expect('Content-Type', /json/)
      .expect(500);
    expect(response.body.message).toContain('Error processing file');
  });
});
});
