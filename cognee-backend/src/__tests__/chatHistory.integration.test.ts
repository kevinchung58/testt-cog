// Placeholder for /chat/history... endpoints tests
import request from 'supertest';
import express from 'express';
// Import mocks and app

jest.mock('../toolkit/graph-builder', () => {
  const actual = jest.requireActual('../toolkit/graph-builder');
  return {
    ...actual,
    getChatHistory: jest.fn(),
    deleteChatHistory: jest.fn(),
    // Add other graph-builder mocks if needed
    getGraphOverview: jest.fn(),
    getNodeWithNeighbors: jest.fn(),
    fetchGraphSchemaSummary: jest.fn(),
    queryGraph: jest.fn(),
    documentsToGraph: jest.fn(),
    saveChatMessage: jest.fn(),
    saveUserPrompt: jest.fn(),
    getSavedPrompts: jest.fn(),
    deleteSavedPrompt: jest.fn()
  };
});

let app: express.Application;
try {
  const serverModule = require('../server');
  app = serverModule.app;
  if (!app) throw new Error("App not exported from server.ts");
} catch (e) {
  console.error("Failed to import app from server.ts for testing in chatHistory.integration.test.ts", e);
  process.exit(1);
}

import { getChatHistory, deleteChatHistory } from '../toolkit/graph-builder';

describe('API Endpoints - Chat History', () => {
  // Note: The POST /query endpoint also interacts with chat history (saveChatMessage)
  // but its tests are primarily in query.integration.test.ts.
  // This file focuses on dedicated history retrieval and deletion endpoints.

  describe('GET /chat/history/:sessionId', () => {
    let mockGetChatHistory: vi.Mock;
    beforeEach(() => {
        mockGetChatHistory = jest.requireMock('../toolkit/graph-builder').getChatHistory;
        mockGetChatHistory.mockReset();
    });

    it('should return 200 with chat history for a valid session ID', async () => {
        const sessionId = 'session123';
        const mockHistory = [{ id: 'msg1', type: 'user', text: 'Hello' }];
        mockGetChatHistory.mockResolvedValue(mockHistory);
        const response = await request(app)
            .get(`/chat/history/${sessionId}`)
            .expect('Content-Type', /json/)
            .expect(200);
        expect(response.body).toEqual(mockHistory);
        expect(mockGetChatHistory).toHaveBeenCalledWith(sessionId);
    });
    // Add tests for 400 (missing sessionId - though route might catch this) and 500
  });

  describe('DELETE /chat/history/:sessionId', () => {
    let mockDeleteChatHistory: vi.Mock;
    beforeEach(() => {
      mockDeleteChatHistory = jest.requireMock('../toolkit/graph-builder').deleteChatHistory;
      mockDeleteChatHistory.mockReset();
    });

    it('should delete chat history and return 204 for a valid session ID', async () => {
      const sessionIdToDelete = 'session-to-delete-123';
      mockDeleteChatHistory.mockResolvedValue(undefined);
      await request(app)
        .delete(`/chat/history/${sessionIdToDelete}`)
        .expect(204);
      expect(mockDeleteChatHistory).toHaveBeenCalledWith(sessionIdToDelete);
    });
    // Add tests for 404 and 500
  });
});
