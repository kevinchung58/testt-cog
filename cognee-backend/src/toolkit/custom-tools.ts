import { Tool } from "@langchain/core/tools";
import Browserbase from "@browserbasehq/sdk";

class GoogleSearchTool extends Tool {
  name = "google_search";
  description = "A tool for performing a Google search and getting back the results.";

  constructor() {
    super();
  }

  protected async _call(query: string): Promise<string> {
    console.log(`Performing Google search for: ${query}`);
    try {
      const browserbase = new Browserbase();
      // Placeholder: I need to find the correct method. I'll try `browse` as a guess.
      const results = await browserbase.browse({
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          // This is a guess at what the API might look like.
          // I will need to confirm this.
          logic: "EXTRACT_SEARCH_RESULTS"
      });

      if (!results || (results as any[]).length === 0) {
        return "No results found.";
      }

      const formattedResults = (results as any[]).slice(0, 5).map((result: any, index: number) =>
        `${index + 1}. ${result.title}\n` +
        `   Link: ${result.link}\n` +
        `   Snippet: ${result.snippet}`
      ).join("\n\n");

      return formattedResults;
    } catch (error: any) {
      console.error("Error during Google search:", error);
      return `Error performing search: ${error.message}`;
    }
  }
}

export { GoogleSearchTool };
