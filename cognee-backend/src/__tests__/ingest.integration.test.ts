// Placeholder for /ingest endpoint tests
import request from 'supertest';
import express from 'express';
// Import mocks and app similar to the original server.integration.test.ts

jest.mock('../toolkit/graph-builder', () => {
  const actual = jest.requireActual('../toolkit/graph-builder');
  return {
    ...actual,
    documentsToGraph: jest.fn(),
    // Add other graph-builder mocks if ingest indirectly uses them or for consistency
    getGraphOverview: jest.fn(),
    getNodeWithNeighbors: jest.fn(),
    fetchGraphSchemaSummary: jest.fn(),
    queryGraph: jest.fn(),
    saveChatMessage: jest.fn(),
    getChatHistory: jest.fn(),
    deleteChatHistory: jest.fn(),
    saveUserPrompt: jest.fn(),
    getSavedPrompts: jest.fn(),
    deleteSavedPrompt: jest.fn()
  };
});

jest.mock('../toolkit/vector-store', () => ({
  ...jest.requireActual('../toolkit/vector-store'),
  addDocuments: jest.fn(),
  createRetriever: jest.fn() // Though not directly used by /ingest, good to keep consistent if other tests need it
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
  console.error("Failed to import app from server.ts for testing in ingest.integration.test.ts", e);
  process.exit(1);
}

import { processFileToDocuments } from '../toolkit/data-processor';
import { addDocuments as addDocumentsToVectorStore } from '../toolkit/vector-store';
import { documentsToGraph } from '../toolkit/graph-builder';


describe('API Endpoints - POST /ingest', () => {
  let processFileToDocumentsMock: vi.Mock;
  let addDocumentsToVectorStoreMock: vi.Mock;
  let documentsToGraphMock: vi.Mock;

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
      .attach('file', Buffer.from('test content'), 'test.txt')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.message).toContain('File ingested successfully');
    expect(response.body.documentsProcessed).toBe(mockDocuments.length);
    expect(processFileToDocumentsMock).toHaveBeenCalled();
    expect(addDocumentsToVectorStoreMock).toHaveBeenCalledWith(mockDocuments, expect.any(String));
    expect(documentsToGraphMock).toHaveBeenCalledWith(mockDocuments);
  });

  it('should skip graph building if buildGraph=false query param is passed', async () => {
    processFileToDocumentsMock.mockResolvedValue([{ pageContent: 'Test content', metadata: {} }]);
    addDocumentsToVectorStoreMock.mockResolvedValue(undefined);

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
    processFileToDocumentsMock.mockResolvedValue([]);

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
