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
  FeGraphLink
} from '../graph-builder';
import { Document } from '@langchain/core/documents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import neo4j, { QueryResult } from 'neo4j-driver';

jest.mock('@langchain/google-genai');
jest.mock('neo4j-driver');

describe('Graph Builder Toolkit', () => {
  let mockLlm: Partial<ChatGoogleGenerativeAI>;
  let mockDriver: any;
  let mockSession: any;
  let mockTransaction: any;

  const mockDocument = new Document({ pageContent: 'Steve Jobs co-founded Apple.' });
  const mockGraphElements: GraphElements = {
    nodes: [{ id: 'steve_jobs', type: 'Person', properties: { name: 'Steve Jobs' } }],
    relationships: [],
  };

  beforeEach(() => {
    (ChatGoogleGenerativeAI as jest.Mock).mockClear();
    (neo4j.driver as jest.Mock).mockClear();

    mockLlm = {
      // .pipe().invoke() structure for chain simulation
      pipe: jest.fn().mockReturnThis(),
      invoke: jest.fn().mockResolvedValue(JSON.stringify(mockGraphElements)),
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
    test('should call LLM and parse its JSON response', async () => {
      const result = await extractGraphElementsFromDocument(mockDocument);
      expect(mockLlm.invoke).toHaveBeenCalled();
      expect(result).toEqual(mockGraphElements);
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
    test('should generate Cypher with LLM and execute it', async () => {
      (mockLlm.invoke as jest.Mock).mockResolvedValue('MATCH (n) RETURN n.name AS name'); // LLM returns Cypher
      (mockSession.run as jest.Mock).mockResolvedValue({ records: [{ get: (key: string) => 'Test Node', toObject: () => ({name: 'Test Node'}) }], summary: {} } as unknown as QueryResult);

      // Mock fetchGraphSchemaSummary for this test, assuming it's also part of the module or imported correctly
      jest.spyOn(globalThis, 'fetchGraphSchemaSummary' as any).mockResolvedValue({ nodeLabels: ['TestLabel'], relationshipTypes: ['TEST_REL'], propertyKeys: ['name'] });


      const results = await queryGraph('What is the test node?');
      expect(mockLlm.invoke).toHaveBeenCalledWith(expect.objectContaining({ question: 'What is the test node?' }));
      expect(mockSession.run).toHaveBeenCalledWith('MATCH (n) RETURN n.name AS name', undefined);
      expect(results).toEqual([{name: 'Test Node'}]);
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

});
