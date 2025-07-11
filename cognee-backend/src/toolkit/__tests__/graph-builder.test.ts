import {
  extractGraphElementsFromDocument,
  addGraphElementsToNeo4j,
  queryGraph,
  documentsToGraph,
  fetchGraphSchemaSummary,
  GraphElements,
  getGraphOverview,
  getNodeWithNeighbors,
  FeGraphData,
  FeGraphNode,
  FeGraphLink,
  deleteChatHistory // Import the function to be tested
} from '../graph-builder';
import { Document } from '@langchain/core/documents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import neo4j, { QueryResult } from 'neo4j-driver';

jest.mock('@langchain/google-genai');
jest.mock('neo4j-driver');
jest.mock('../config', () => ({
  ...jest.requireActual('../config'),
  GEMINI_API_KEY: 'test-gemini-api-key',
  DEFAULT_CHAT_MODEL_NAME: 'mock-chat-model-graph', // Specific for graph builder tests
}));

describe('Graph Builder Toolkit', () => {
  let mockLlm: Partial<ChatGoogleGenerativeAI>;
  let mockConfig: any;
  let mockDriver: any;
  let mockSession: any;
  let mockTransaction: any;

  const mockDocument = new Document({ pageContent: 'Steve Jobs co-founded Apple.' });
  const mockGraphElements: GraphElements = {
    nodes: [{ id: 'steve_jobs', type: 'Person', properties: { name: 'Steve Jobs' } }],
    relationships: [],
  };

  beforeAll(() => {
    mockConfig = require('../config');
  });

  beforeEach(() => {
    (ChatGoogleGenerativeAI as jest.Mock).mockClear();
    (neo4j.driver as jest.Mock).mockClear();

    // Configure the mockLlm to be returned by the ChatGoogleGenerativeAI constructor mock
    // This ensures that when new ChatGoogleGenerativeAI is called inside the functions,
    // it uses this mockLlm instance, allowing us to spy on its methods like .invoke or .pipe
    mockLlm = {
      pipe: jest.fn().mockReturnThis(), // for chain .pipe().pipe()
      invoke: jest.fn().mockResolvedValue(JSON.stringify(mockGraphElements)), // for chains ending in .invoke()
    };
    (ChatGoogleGenerativeAI as jest.Mock).mockImplementation(() => mockLlm);


    mockTransaction = {
      run: jest.fn().mockResolvedValue({ records: [], summary: {} } as QueryResult),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [], summary: {} } as QueryResult),
      writeTransaction: jest.fn(callback => callback(mockTransaction)),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
      verifyConnectivity: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (neo4j.driver as jest.Mock).mockReturnValue(mockDriver);
  });

  describe('extractGraphElementsFromDocument', () => {
    test('should initialize LLM with configured model, call LLM, and parse its JSON response', async () => {
      const result = await extractGraphElementsFromDocument(mockDocument);

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: mockConfig.GEMINI_API_KEY,
        modelName: mockConfig.DEFAULT_CHAT_MODEL_NAME,
        temperature: 0.2, // Matching temperature in graph-builder.ts
      });
      expect(mockLlm.invoke).toHaveBeenCalledWith({ document_content: mockDocument.pageContent });
      expect(result).toEqual(mockGraphElements);
    });

    test('should use provided chatModelName for LLM when extracting graph elements', async () => {
      const specificModel = "gemini-pro-vision"; // Example specific model
      await extractGraphElementsFromDocument(mockDocument, specificModel);
      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: mockConfig.GEMINI_API_KEY,
        modelName: specificModel,
        temperature: 0.2,
      });
    });
  });

  describe('addGraphElementsToNeo4j', () => {
    test('should run MERGE queries for nodes and relationships', async () => {
      await addGraphElementsToNeo4j(mockGraphElements);
      expect(mockDriver.session).toHaveBeenCalled();
      expect(mockSession.writeTransaction).toHaveBeenCalled();
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (n:Resource {id: $id})'),
        expect.any(Object)
      );
    });
  });

  describe('documentsToGraph', () => {
    test('should process each document and add elements', async () => {
       // Spy on the functions to ensure they are called
      const extractSpy = jest.spyOn(globalThis, 'extractGraphElementsFromDocument' as any).mockResolvedValue(mockGraphElements);
      const addSpy = jest.spyOn(globalThis, 'addGraphElementsToNeo4j' as any).mockResolvedValue(undefined);

      await documentsToGraph([mockDocument, mockDocument]);

      expect(extractSpy).toHaveBeenCalledTimes(2);
      expect(addSpy).toHaveBeenCalledTimes(2);

      extractSpy.mockRestore();
      addSpy.mockRestore();
    });
  });

  describe('queryGraph', () => {
    test('should initialize LLM with configured model, generate Cypher, and execute it', async () => {
      const generatedCypher = 'MATCH (n) RETURN n.name AS name';
      // Ensure the invoke mock specific to this chain is set up
      const llmOutputParserChainMock = { invoke: jest.fn().mockResolvedValue(generatedCypher) };
      const llmPipeMock = { pipe: jest.fn().mockReturnValue(llmOutputParserChainMock) };
      (ChatGoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        pipe: jest.fn().mockReturnValue(llmPipeMock),
      }));


      (mockSession.run as jest.Mock).mockResolvedValue({ records: [{ get: (key: string) => 'Test Node', toObject: () => ({name: 'Test Node'}) }], summary: {} } as unknown as QueryResult);

      // Temporarily mock fetchGraphSchemaSummary within this test's scope or ensure it's globally mocked if preferred
      const originalFetchGraphSchemaSummary = jest.requireActual('../graph-builder').fetchGraphSchemaSummary;
      const fetchSchemaSpy = jest.spyOn(jest.requireActual('../graph-builder'), 'fetchGraphSchemaSummary').mockImplementation(async () => {
        // Simulate what fetchGraphSchemaSummary would do regarding DB calls if needed, or just return mock.
        // For this test, we want queryGraph to call the actual logic that might call the DB for schema.
        // So, we mock the DB call inside fetchGraphSchemaSummary instead.
        // However, the `beforeEach` already mocks session.run globally. So we need to refine.

        // For this test, let's assume fetchGraphSchemaSummary is called and works (relies on global mockSession.run)
        // Or, if we want to isolate queryGraph's LLM part more, mock fetchGraphSchemaSummary directly here.
        return { nodeLabels: ['TestLabel'], relationshipTypes: ['TEST_REL'], propertyKeys: ['name'] };
      });


      const results = await queryGraph('What is the test node?');

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: mockConfig.GEMINI_API_KEY,
        modelName: mockConfig.DEFAULT_CHAT_MODEL_NAME,
        temperature: 0.2,
      });
      // Check that the LLM chain (via the final invoke) was called with schema and question
      expect(llmOutputParserChainMock.invoke).toHaveBeenCalledWith(expect.objectContaining({
         question: 'What is the test node?',
         schema: expect.stringContaining('Node Labels: TestLabel')
      }));
      expect(mockSession.run).toHaveBeenCalledWith(generatedCypher, undefined);
      expect(results).toEqual([{name: 'Test Node'}]);

      fetchSchemaSpy.mockRestore(); // Clean up spy
    });

    test('should use provided chatModelName for LLM when querying graph', async () => {
      const specificModel = "gemini-1.5-pro-latest";
      const generatedCypher = 'MATCH (n) RETURN n';
      const llmOutputParserChainMock = { invoke: jest.fn().mockResolvedValue(generatedCypher) };
      const llmPipeMock = { pipe: jest.fn().mockReturnValue(llmOutputParserChainMock) };
      (ChatGoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        pipe: jest.fn().mockReturnValue(llmPipeMock),
      }));

      // Mock fetchGraphSchemaSummary to avoid its DB call / ensure it returns something simple
      jest.spyOn(jest.requireActual('../graph-builder'), 'fetchGraphSchemaSummary')
          .mockResolvedValue({ nodeLabels: ['Any'], relationshipTypes: ['ANY_REL'], propertyKeys: ['anyProp'] });

      await queryGraph('Any question', undefined, specificModel);
      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: mockConfig.GEMINI_API_KEY,
        modelName: specificModel,
        temperature: 0.2,
      });
    });
  });

  describe('fetchGraphSchemaSummary', () => {
    test('should call db.labels(), db.relationshipTypes(), and db.propertyKeys()', async () => {
      // Setup mock responses for each call
      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{ get: () => ['Label1'] }], summary: {} } as unknown as QueryResult) // db.labels()
        .mockResolvedValueOnce({ records: [{ get: () => ['REL1'] }], summary: {} } as unknown as QueryResult)   // db.relationshipTypes()
        .mockResolvedValueOnce({ records: [{ get: () => ['prop1'] }], summary: {} } as unknown as QueryResult); // db.propertyKeys()

      const schema = await fetchGraphSchemaSummary();
      expect(mockSession.run).toHaveBeenCalledWith('CALL db.labels() YIELD label RETURN collect(label) AS nodeLabels');
      expect(mockSession.run).toHaveBeenCalledWith('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS relationshipTypes');
      expect(mockSession.run).toHaveBeenCalledWith('CALL db.propertyKeys() YIELD propertyKey RETURN collect(propertyKey) AS propertyKeys');
      expect(schema.nodeLabels).toEqual(['Label1']);
      expect(schema.relationshipTypes).toEqual(['REL1']);
      expect(schema.propertyKeys).toEqual(['prop1']);
    });
  });

  describe('getGraphOverview', () => {
    beforeEach(() => {
      // Reset the session.run mock for these specific tests
      mockSession.run.mockReset();
    });

    test('should call executeCypherQuery with correct query for no search term', async () => {
      const mockRecords: any[] = [
        { keys: ['n', 'r', 'm'], get: (key: string) => {
            if (key === 'n') return { identity: { toString: () => '1' }, labels: ['TypeA'], properties: { id: 'node1', name: 'Node 1' } };
            if (key === 'm') return { identity: { toString: () => '2' }, labels: ['TypeB'], properties: { id: 'node2', name: 'Node 2' } };
            if (key === 'r') return { type: 'RELATES_TO', start: { toString: () => '1' }, end: { toString: () => '2' }, properties: {} };
            return null;
        }}
      ];
      mockSession.run.mockResolvedValue({ records: mockRecords, summary: {} } as unknown as QueryResult);

      const result = await getGraphOverview(undefined, 10);
      expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MATCH (n) OPTIONAL MATCH (n)-[r]-(m) RETURN n, r, m LIMIT $limit'), { limit: 10 });
      expect(result.nodes).toHaveLength(2);
      expect(result.links).toHaveLength(1);
      expect(result.nodes.find(n => n.id === 'node1')?.name).toBe('Node 1');
      expect(result.links[0].type).toBe('RELATES_TO');
    });

    test('should call executeCypherQuery with correct query for a search term', async () => {
      mockSession.run.mockResolvedValue({ records: [], summary: {} } as unknown as QueryResult); // No need to check data transformation here again
      await getGraphOverview('searchTerm', 5);
      expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('WHERE (n.name CONTAINS $searchTerm OR n.id CONTAINS $searchTerm OR n.nodeType CONTAINS $searchTerm)'), { searchTerm: 'searchTerm', limit: 5 });
    });
  });

  describe('getNodeWithNeighbors', () => {
    beforeEach(() => {
      mockSession.run.mockReset();
    });
    test('should call executeCypherQuery with correct query for a nodeId', async () => {
      const mockRecords: any[] = [
        { keys: ['n', 'r', 'm'], get: (key: string) => {
            if (key === 'n') return { identity: { toString: () => '1' }, labels: ['TypeA'], properties: { id: 'node1', name: 'Node 1' } };
            if (key === 'm') return { identity: { toString: () => '2' }, labels: ['TypeB'], properties: { id: 'node2', name: 'Node 2' } };
            if (key === 'r') return { type: 'CONNECTED_TO', start: { toString: () => '1' }, end: { toString: () => '2' }, properties: {} };
            return null;
        }}
      ];
      mockSession.run.mockResolvedValue({ records: mockRecords, summary: {} } as unknown as QueryResult);

      const result = await getNodeWithNeighbors('node1');
      expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MATCH (n {id: $nodeId})-[r]-(m) RETURN n, r, m UNION MATCH (n {id: $nodeId}) RETURN n, null as r, null as m'), { nodeId: 'node1' });
      expect(result.nodes).toHaveLength(2);
      expect(result.links).toHaveLength(1);
    });
  });

  describe('deleteChatHistory', () => {
    const sessionIdToDelete = 'test-session-id-to-delete';

    beforeEach(() => {
      // Reset the transaction.run mock for these specific tests
      mockTransaction.run.mockReset();
      // Ensure writeTransaction is called with a function that uses our mockTransaction
      mockSession.writeTransaction = jest.fn(async (callback) => callback(mockTransaction));
    });

    test('should execute correct Cypher queries to delete messages and session', async () => {
      await deleteChatHistory(sessionIdToDelete);

      expect(mockSession.writeTransaction).toHaveBeenCalledTimes(1); // Should be one transaction now with two .run calls

      // Check the first .run call for deleting messages and their relationships
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (s:ChatSession {sessionId: $sessionId})-[hr:HAS_MESSAGE]->(msg:ChatMessage)'),
        { sessionId: sessionIdToDelete }
      );
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('OPTIONAL MATCH (msg)-[nr:NEXT_MESSAGE]-()'),
        { sessionId: sessionIdToDelete }
      );
       expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('DETACH DELETE msg, nr'), // This is part of the first query
        { sessionId: sessionIdToDelete }
      );

      // Check the second .run call for deleting the session node
      expect(mockTransaction.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (s:ChatSession {sessionId: $sessionId}) DETACH DELETE s'),
        { sessionId: sessionIdToDelete }
      );

      // Verify it's called twice within the transaction
      expect(mockTransaction.run).toHaveBeenCalledTimes(2);
    });

    test('should not throw if session or messages do not exist', async () => {
      // Mock transaction.run to simulate no nodes found (e.g., returns empty results or summary indicating no changes)
      mockTransaction.run.mockResolvedValue({ records: [], summary: { counters: { nodesDeleted: () => 0, relationshipsDeleted: () => 0 } } } as unknown as QueryResult);

      await expect(deleteChatHistory(sessionIdToDelete)).resolves.not.toThrow();
      expect(mockTransaction.run).toHaveBeenCalledTimes(2); // Still attempts both deletes
    });

    test('should throw an error if Neo4j operation fails', async () => {
      const dbError = new Error('Neo4j connection failed');
      mockTransaction.run.mockRejectedValueOnce(dbError); // Simulate failure on the first delete query

      await expect(deleteChatHistory(sessionIdToDelete)).rejects.toThrow('Failed to delete chat history: Neo4j connection failed');
      expect(mockTransaction.run).toHaveBeenCalledTimes(1); // Should fail on the first attempt
    });
  });
});
