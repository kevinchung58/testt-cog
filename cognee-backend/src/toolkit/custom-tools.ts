import { Tool } from "@langchain/core/tools";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { extractSearchResultsFromHtml, SearchResult } from '../services/llmService';

class GoogleSearchTool extends Tool {
  name = "google_search";
  description = "A tool for performing a Google search and getting back the top results. Input should be a search query.";

  constructor() {
    super();
  }

  protected async _call(query: string): Promise<string> {
    console.log(`Performing Google search for: ${query}`);

    if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
      const errorMessage = "Missing required environment variables for GoogleSearchTool (BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID).";
      console.error(errorMessage);
      return errorMessage;
    }
     if (!process.env.GEMINI_API_KEY) {
        const errorMessage = "Missing GEMINI_API_KEY for search result extraction.";
        console.error(errorMessage);
        return errorMessage;
    }

    let stagehand: Stagehand | null = null;
    try {
      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
      });

      await stagehand.init();
      const page = stagehand.page;

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      console.log(`Navigating to ${searchUrl}`);
      await page.goto(searchUrl);

      const htmlContent = await page.content();

      const { results } = await extractSearchResultsFromHtml(htmlContent);

      if (!results || results.length === 0) {
        return "No results found.";
      }

      const formattedResults = results.slice(0, 5).map((result: SearchResult, index: number) =>
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
