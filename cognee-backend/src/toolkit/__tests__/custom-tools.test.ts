import { GoogleSearchTool } from '../custom-tools';
import { Stagehand } from '@browserbasehq/stagehand';
import * as llmService from '../../services/llmService';

// Mock the Stagehand class and the llmService
jest.mock('@browserbasehq/stagehand');
jest.mock('../../services/llmService');

describe('GoogleSearchTool with Stagehand and Gemini', () => {
  let MockedStagehand: jest.Mock;
  let mockPage: { goto: jest.Mock, content: jest.Mock };
  let mockStagehandInstance: { init: jest.Mock, page: any, close: jest.Mock };
  let extractSearchResultsMock: jest.SpyInstance;

  beforeEach(() => {
    // Set up environment variables required by the tool
    process.env.BROWSERBASE_API_KEY = 'mock_bb_key';
    process.env.BROWSERBASE_PROJECT_ID = 'mock_bb_project';
    process.env.GEMINI_API_KEY = 'mock_gemini_key';

    // Reset mocks for each test
    MockedStagehand = Stagehand as jest.Mock;
    MockedStagehand.mockClear();

    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue('<html><body>Mock HTML</body></html>'),
    };

    mockStagehandInstance = {
      init: jest.fn().mockResolvedValue(undefined),
      page: mockPage,
      close: jest.fn().mockResolvedValue(undefined),
    };

    MockedStagehand.mockImplementation(() => mockStagehandInstance);

    // Spy on and mock the llmService function
    extractSearchResultsMock = jest.spyOn(llmService, 'extractSearchResultsFromHtml');
  });

  afterEach(() => {
    // Clean up environment variables and mocks
    delete process.env.BROWSERBASE_API_KEY;
    delete process.env.BROWSERBASE_PROJECT_ID;
    delete process.env.GEMINI_API_KEY;
    extractSearchResultsMock.mockRestore();
  });

  it('should call Stagehand and Gemini extractor and format the results', async () => {
    const tool = new GoogleSearchTool();
    const query = 'What is Stagehand?';

    const mockLLMResponse = {
      results: [
        { title: 'Title 1', link: 'https://link1.com', snippet: 'Snippet 1' },
        { title: 'Title 2', link: 'https://link2.com', snippet: 'Snippet 2' },
      ]
    };
    extractSearchResultsMock.mockResolvedValue(mockLLMResponse);

    const result = await tool.invoke({ input: query });

    // Verify Stagehand was initialized and used correctly
    expect(MockedStagehand).toHaveBeenCalledTimes(1);
    expect(mockStagehandInstance.init).toHaveBeenCalledTimes(1);
    expect(mockPage.goto).toHaveBeenCalledWith(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    expect(mockPage.content).toHaveBeenCalledTimes(1);
    expect(extractSearchResultsMock).toHaveBeenCalledWith('<html><body>Mock HTML</body></html>');
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

  it('should handle cases with no results found from extractor', async () => {
    const tool = new GoogleSearchTool();
    extractSearchResultsMock.mockResolvedValue({ results: [] });

    const result = await tool.invoke({ input: 'a query with no results' });

    expect(result).toBe('No results found.');
    expect(mockStagehandInstance.close).toHaveBeenCalledTimes(1);
  });

  it('should handle errors during the Stagehand process', async () => {
    const tool = new GoogleSearchTool();
    const errorMessage = 'Failed to initialize';
    mockStagehandInstance.init.mockRejectedValue(new Error(errorMessage));

    const result = await tool.invoke({ input: 'a query that will fail' });

    expect(result).toBe(`Error performing search: ${errorMessage}`);
    expect(mockStagehandInstance.close).toHaveBeenCalledTimes(1);
  });

  it('should return an error message if Browserbase environment variables are missing', async () => {
    delete process.env.BROWSERBASE_API_KEY;
    const tool = new GoogleSearchTool();
    const result = await tool.invoke({ input: 'any query' });
    expect(result).toContain('Missing required environment variables for GoogleSearchTool');
    expect(MockedStagehand).not.toHaveBeenCalled();
  });

  it('should return an error message if Gemini API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const tool = new GoogleSearchTool();
    const result = await tool.invoke({ input: 'any query' });
    expect(result).toContain('Missing GEMINI_API_KEY');
    expect(MockedStagehand).not.toHaveBeenCalled();
  });
});
