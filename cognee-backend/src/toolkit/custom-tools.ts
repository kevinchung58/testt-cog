import { Tool } from "@langchain/core/tools";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

// Define the schema for a single search result using Zod
const searchResultSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  snippet: z.string(),
});

// Define the schema for the array of search results
const searchResultsSchema = z.array(searchResultSchema);

class GoogleSearchTool extends Tool {
  name = "google_search";
  description = "A tool for performing a Google search and getting back the top results. Input should be a search query.";

  constructor() {
    super();
  }

  protected async _call(query: string): Promise<string> {
    console.log(`Performing Google search for: ${query}`);

    // Stagehand requires API keys to be set in environment variables.
    // This is a more secure and flexible approach than hardcoding them.
    if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID || !process.env.OPENAI_API_KEY) {
      const errorMessage = "Missing required environment variables for GoogleSearchTool (BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, OPENAI_API_KEY).";
      console.error(errorMessage);
      return errorMessage;
    }

    let stagehand: Stagehand | null = null;
    try {
      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        modelName: "gpt-4o", // Using a capable model for extraction
        modelClientOptions: {
          apiKey: process.env.OPENAI_API_KEY,
        },
      });

      await stagehand.init();
      const page = stagehand.page;

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      console.log(`Navigating to ${searchUrl}`);
      await page.goto(searchUrl);

      // Use the extract method with a Zod schema to get structured data
      const { results } = await page.extract({
        instruction: "Extract the organic search results from the main content area. For each result, get the title, the full URL link, and the descriptive snippet. Ignore ads, 'People also ask' sections, and other non-essential parts.",
        schema: z.object({
          results: searchResultsSchema
        }),
      });

      if (!results || results.length === 0) {
        return "No results found.";
      }

      // Format the structured results into a string
      const formattedResults = results.slice(0, 5).map((result: z.infer<typeof searchResultSchema>, index: number) =>
        `${index + 1}. ${result.title}\n` +
        `   Link: ${result.link}\n` +
        `   Snippet: ${result.snippet}`
      ).join("\n\n");

      return formattedResults;
    } catch (error: any) {
      console.error("Error during Google search with Stagehand:", error);
      return `Error performing search: ${error.message}`;
    } finally {
      if (stagehand) {
        await stagehand.close();
        console.log("Stagehand session closed.");
      }
    }
  }
}

export { GoogleSearchTool };
