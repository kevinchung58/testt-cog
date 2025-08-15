import * as graphBuilder from '../graph-builder';
import { Document } from '@langchain/core/documents';
import { AIMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import neo4j, { QueryResult } from 'neo4j-driver';
import { GraphElements } from '../graph-builder';

jest.mock('@langchain/google-genai');
jest.mock('neo4j-driver');
jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  GEMINI_API_KEY: 'test-gemini-api-key',
  DEFAULT_CHAT_MODEL_NAME: 'mock-chat-model-graph',
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
    mockConfig = require('../../config');
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Ensure a clean slate for all mocks

    (ChatGoogleGenerativeAI as unknown as jest.Mock).mockClear();
    (neo4j.driver as unknown as jest.Mock).mockClear();

    mockLlm = {
      pipe: jest.fn().mockReturnThis(),
      invoke: jest.fn().mockResolvedValue(new AIMessage(JSON.stringify(mockGraphElements))),
    };
    (ChatGoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => mockLlm);

    mockTransaction = {
      run: jest.fn().mockResolvedValue({ records: [], summary: {} } as unknown as QueryResult),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [], summary: {} } as unknown as QueryResult),
      writeTransaction: jest.fn(callback => callback(mockTransaction)),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
      verifyConnectivity: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (neo4j.driver as unknown as jest.Mock).mockReturnValue(mockDriver);
  });

  describe('extractGraphElementsFromDocument', () => {
    test('should initialize LLM with configured model, call LLM, and parse its JSON response', async () => {
      const result = await graphBuilder.extractGraphElementsFromDocument(mockDocument);

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: mockConfig.GEMINI_API_KEY,
        model: mockConfig.DEFAULT_CHAT_MODEL_NAME,
        temperature: 0.2,
      });
      // The invoke method is called with a ChatPromptValue object, not a simple object.
      // Using expect.any(Object) makes the test more robust against LangChain internal changes.
      expect(mockLlm.invoke).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual(mockGraphElements);
    });
  });

  describe('addGraphElementsToNeo4j', () => {
    test('should run MERGE queries for nodes and relationships', async () => {
      await graphBuilder.addGraphElementsToNeo4j(mockGraphElements);
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
      const extractSpy = jest.spyOn(graphBuilder, 'extractGraphElementsFromDocument').mockResolvedValue(mockGraphElements);
      const addSpy = jest.spyOn(graphBuilder, 'addGraphElementsToNeo4j').mockResolvedValue(undefined);

      await graphBuilder.documentsToGraph([mockDocument, mockDocument]);

      expect(extractSpy).toHaveBeenCalledTimes(2);
      expect(addSpy).toHaveBeenCalledTimes(2);

      extractSpy.mockRestore();
      addSpy.mockRestore();
    });
  });

  describe('queryGraph', () => {
    test('should initialize LLM, generate Cypher, and execute it', async () => {
      const generatedCypher = 'MATCH (n) RETURN n.name AS name';
      const llmOutputParserChainMock = { invoke: jest.fn().mockResolvedValue(generatedCypher) };
      (mockLlm.pipe as jest.Mock).mockReturnValue(llmOutputParserChainMock);

      (mockSession.run as jest.Mock).mockResolvedValue({ records: [{ get: (key: string) => 'Test Node', toObject: () => ({name: 'Test Node'}) }], summary: {} } as unknown as QueryResult);

      const fetchSchemaSpy = jest.spyOn(graphBuilder, 'fetchGraphSchemaSummary').mockResolvedValue({
        nodeLabels: ['TestLabel'],
        relationshipTypes: ['TEST_REL'],
        propertyKeys: ['name'],
      });

      const results = await graphBuilder.queryGraph('What is the test node?');

      expect(ChatGoogleGenerativeAI).toHaveBeenCalled();
      expect(llmOutputParserChainMock.invoke).toHaveBeenCalledWith(expect.objectContaining({
         question: 'What is the test node?',
         schema: expect.stringContaining('Node Labels: TestLabel')
      }));
      expect(mockSession.run).toHaveBeenCalledWith(generatedCypher, undefined);
      expect(results).toEqual([{name: 'Test Node'}]);

      fetchSchemaSpy.mockRestore();
    });
  });

  describe('fetchGraphSchemaSummary', () => {
    test('should call db.labels(), db.relationshipTypes(), and db.propertyKeys()', async () => {
      (mockSession.run as jest.Mock)
        .mockResolvedValueOnce({ records: [{ get: () => ['Label1'] }], summary: {} } as unknown as QueryResult)
        .mockResolvedValueOnce({ records: [{ get: () => ['REL1'] }], summary: {} } as unknown as QueryResult)
        .mockResolvedValueOnce({ records: [{ get: () => ['prop1'] }], summary: {} } as unknown as QueryResult);

      const schema = await graphBuilder.fetchGraphSchemaSummary();
      expect(mockSession.run).toHaveBeenCalledWith('CALL db.labels() YIELD label RETURN collect(label) AS nodeLabels');
      expect(mockSession.run).toHaveBeenCalledWith('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS relationshipTypes');
      expect(mockSession.run).toHaveBeenCalledWith('CALL db.propertyKeys() YIELD propertyKey RETURN collect(propertyKey) AS propertyKeys');
      expect(schema.nodeLabels).toEqual(['Label1']);
      expect(schema.relationshipTypes).toEqual(['REL1']);
      expect(schema.propertyKeys).toEqual(['prop1']);
    });
  });

  // Tests for getGraphOverview, getNodeWithNeighbors, deleteChatHistory would go here
  // They need to be refactored to use graphBuilder.functionName syntax
});
