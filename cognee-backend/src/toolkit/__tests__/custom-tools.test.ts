import { GoogleSearchTool } from '../custom-tools';
import Browserbase from '@browserbasehq/sdk';

// Mock the Browserbase class, which is the default export of the module.
jest.mock('@browserbasehq/sdk');

describe('GoogleSearchTool', () => {
  // This holds the mock constructor for Browserbase.
  let MockedBrowserbase: jest.Mock;
  // This holds the mock instance's method. I'll use the name from my implementation guess.
  let mockBrowse: jest.Mock;

  beforeEach(() => {
    // Assign the mocked default export to a variable.
    MockedBrowserbase = Browserbase as unknown as jest.Mock;
    // Reset its state before each test.
    MockedBrowserbase.mockClear();

    // Create a fresh mock for the method for each test.
    mockBrowse = jest.fn();
    // When the mock constructor is called, return an object with our mock method.
    MockedBrowserbase.mockImplementation(() => {
      return {
        browse: mockBrowse,
      };
    });
  });

  it('should create an instance of Browserbase and call the browse method', async () => {
    const tool = new GoogleSearchTool();
    const query = 'What is LangChain?';

    const mockSearchResults = [{
      title: 'LangChain Official Site',
      link: 'https://www.langchain.com/',
      snippet: 'LangChain is a framework for developing applications powered by language models.',
    }];
    mockBrowse.mockResolvedValue(mockSearchResults);

    await tool.invoke({ input: query });

    expect(MockedBrowserbase).toHaveBeenCalledTimes(1);
    expect(mockBrowse).toHaveBeenCalledTimes(1);
    expect(mockBrowse).toHaveBeenCalledWith({
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        logic: "EXTRACT_SEARCH_RESULTS"
    });
  });

  it('should format the search results correctly', async () => {
    const tool = new GoogleSearchTool();
    const query = 'test query';

    const mockSearchResults = [
      { title: 'Title 1', link: 'https://link1.com', snippet: 'Snippet 1' },
      { title: 'Title 2', link: 'https://link2.com', snippet: 'Snippet 2' },
    ];
    mockBrowse.mockResolvedValue(mockSearchResults);

    const result = await tool.invoke({ input: query });

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
    const query = 'a query with no results';

    mockBrowse.mockResolvedValue([]);

    const result = await tool.invoke({ input: query });

    expect(result).toBe('No results found.');
  });

  it('should handle errors during the search process', async () => {
    const tool = new GoogleSearchTool();
    const query = 'a query that will fail';
    const errorMessage = 'Network error';

    mockBrowse.mockRejectedValue(new Error(errorMessage));

    const result = await tool.invoke({ input: query });

    expect(result).toBe(`Error performing search: ${errorMessage}`);
  });
});
