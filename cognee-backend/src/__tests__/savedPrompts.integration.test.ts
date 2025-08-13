// Placeholder for /prompts endpoints tests
import request from 'supertest';
import express from 'express';
// Import mocks and app

jest.mock('../toolkit/graph-builder', () => {
  const actual = jest.requireActual('../toolkit/graph-builder');
  return {
    ...actual,
    saveUserPrompt: jest.fn(),
    getSavedPrompts: jest.fn(),
    deleteSavedPrompt: jest.fn(),
    // Add other graph-builder mocks if needed
    getGraphOverview: jest.fn(),
    getNodeWithNeighbors: jest.fn(),
    fetchGraphSchemaSummary: jest.fn(),
    queryGraph: jest.fn(),
    documentsToGraph: jest.fn(),
    saveChatMessage: jest.fn(),
    getChatHistory: jest.fn(),
    deleteChatHistory: jest.fn()
  };
});

let app: express.Application;
try {
  const serverModule = require('../server');
  app = serverModule.app;
  if (!app) throw new Error("App not exported from server.ts");
} catch (e) {
  console.error("Failed to import app from server.ts for testing in savedPrompts.integration.test.ts", e);
  process.exit(1);
}

import { saveUserPrompt, getSavedPrompts, deleteSavedPrompt } from '../toolkit/graph-builder';

describe('API Endpoints - Saved Prompts (/prompts)', () => {
  let mockSaveUserPrompt: jest.Mock;
  let mockGetSavedPrompts: jest.Mock;
  let mockDeleteSavedPrompt: jest.Mock;

  beforeEach(() => {
    const graphBuilderMock = jest.requireMock('../toolkit/graph-builder');
    mockSaveUserPrompt = graphBuilderMock.saveUserPrompt;
    mockGetSavedPrompts = graphBuilderMock.getSavedPrompts;
    mockDeleteSavedPrompt = graphBuilderMock.deleteSavedPrompt;

    mockSaveUserPrompt.mockReset();
    mockGetSavedPrompts.mockReset();
    mockDeleteSavedPrompt.mockReset();
  });

  describe('POST /prompts', () => {
    it('should create and return a new saved prompt', async () => {
      const newPromptData = { name: 'Test Prompt', text: 'What is testing?' };
      const expectedSavedPrompt = { promptId: 'uuid-123', createdAt: new Date().toISOString(), ...newPromptData };
      mockSaveUserPrompt.mockResolvedValue(expectedSavedPrompt);

      const response = await request(app)
        .post('/prompts')
        .send(newPromptData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toEqual(expectedSavedPrompt);
      expect(mockSaveUserPrompt).toHaveBeenCalledWith(newPromptData.name, newPromptData.text);
    });
    // Add tests for 400 and 500
  });

  describe('GET /prompts', () => {
    it('should return all saved prompts', async () => {
      const mockPrompts = [
        { promptId: 'p1', name: 'P1', text: 'T1', createdAt: new Date().toISOString() },
      ];
      mockGetSavedPrompts.mockResolvedValue(mockPrompts);

      const response = await request(app)
        .get('/prompts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockPrompts);
      expect(mockGetSavedPrompts).toHaveBeenCalled();
    });
    // Add test for 500
  });

  describe('DELETE /prompts/:promptId', () => {
    it('should delete a prompt and return 204', async () => {
      const promptIdToDelete = 'p1';
      mockDeleteSavedPrompt.mockResolvedValue(undefined);

      await request(app)
        .delete(`/prompts/${promptIdToDelete}`)
        .expect(204);

      expect(mockDeleteSavedPrompt).toHaveBeenCalledWith(promptIdToDelete);
    });
    // Add tests for 404 and 500
  });
});
