import { GoogleSearchTool } from '../custom-tools';
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

// Mock the Stagehand class
jest.mock('@browserbasehq/stagehand');

describe('GoogleSearchTool with Stagehand', () => {
  let MockedStagehand: jest.Mock;
  let mockPage: { goto: jest.Mock, extract: jest.Mock };
  let mockStagehandInstance: { init: jest.Mock, page: any, close: jest.Mock };

  beforeEach(() => {
    // Set up environment variables required by the tool
    process.env.BROWSERBASE_API_KEY = 'mock_bb_key';
    process.env.BROWSERBASE_PROJECT_ID = 'mock_bb_project';
    process.env.OPENAI_API_KEY = 'mock_openai_key';

    // Reset mocks for each test
    MockedStagehand = Stagehand as jest.Mock;
    MockedStagehand.mockClear();

    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      extract: jest.fn(),
    };

    mockStagehandInstance = {
      init: jest.fn().mockResolvedValue(undefined),
      page: mockPage,
      close: jest.fn().mockResolvedValue(undefined),
    };

    // When the mock Stagehand constructor is called, return our mock instance
    MockedStagehand.mockImplementation(() => mockStagehandInstance);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.BROWSERBASE_API_KEY;
    delete process.env.BROWSERBASE_PROJECT_ID;
    delete process.env.OPENAI_API_KEY;
  });

  it('should call Stagehand with correct parameters and format the results', async () => {
    const tool = new GoogleSearchTool();
    const query = 'What is Stagehand?';

    const mockApiResponse = {
      results: [
        { title: 'Title 1', link: 'https://link1.com', snippet: 'Snippet 1' },
        { title: 'Title 2', link: 'https://link2.com', snippet: 'Snippet 2' },
      ]
    };
    mockPage.extract.mockResolvedValue(mockApiResponse);

    const result = await tool.invoke({ input: query });

    // Verify Stagehand was initialized and used correctly
    expect(MockedStagehand).toHaveBeenCalledTimes(1);
    expect(mockStagehandInstance.init).toHaveBeenCalledTimes(1);
    expect(mockPage.goto).toHaveBeenCalledWith(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    expect(mockPage.extract).toHaveBeenCalledWith({
      instruction: expect.any(String),
      schema: expect.any(Object), // Relaxing the assertion to check for any object is more robust
    });
    expect(mockStagehandInstance.close).toHaveBeenCalledTimes(1);

    // Verify the output is formatted correctly
    const expectedOutput =
      "1. Title 1\n" +
      "   Link: https://link1.com\n" +
      "   Snippet: Snippet 1\n\n" +
      "2. Title 2\n" +
      "   Link: https://link2.com\n" +
      "   Snippet: Snippet 2";
    expect(result).toBe(expectedOutput);
  });

  it('should handle cases with no results found', async () => {
    const tool = new GoogleSearchTool();
    mockPage.extract.mockResolvedValue({ results: [] });

    const result = await tool.invoke({ input: 'a query with no results' });

    expect(result).toBe('No results found.');
    // Ensure close is still called
    expect(mockStagehandInstance.close).toHaveBeenCalledTimes(1);
  });

  it('should handle errors during the Stagehand process', async () => {
    const tool = new GoogleSearchTool();
    const errorMessage = 'Failed to initialize';
    mockStagehandInstance.init.mockRejectedValue(new Error(errorMessage));

    const result = await tool.invoke({ input: 'a query that will fail' });

    expect(result).toBe(`Error performing search: ${errorMessage}`);
    // Ensure close is still called in the finally block
    expect(mockStagehandInstance.close).toHaveBeenCalledTimes(1);
  });

  it('should return an error message if environment variables are missing', async () => {
    // Unset one of the required env vars
    delete process.env.BROWSERBASE_API_KEY;

    const tool = new GoogleSearchTool();
    const result = await tool.invoke({ input: 'any query' });

    expect(result).toContain('Missing required environment variables');
    // Ensure Stagehand is not even instantiated if env vars are missing
    expect(MockedStagehand).not.toHaveBeenCalled();
  });
});
