# Cognee Backend API Documentation

This document provides details about the API endpoints available in the Cognee backend service.

## Base URL

The API is typically served from `/` relative to the backend's running port (e.g., `http://localhost:3001`).

## Authentication

Currently, there is no authentication implemented for these endpoints.

## LLM Configuration

The Language Models (LLM) and embedding models used by the backend are configured via environment variables. If these variables are not set, the system will use the following defaults:

*   **Default Chat Model:** `gemini-pro` (configurable via `DEFAULT_CHAT_MODEL_NAME` environment variable)
*   **Default Embedding Model:** `text-embedding-004` (configurable via `DEFAULT_EMBEDDING_MODEL_NAME` environment variable)

Model selection via API is not currently supported.

---

## Endpoints

### 1. File Ingestion

*   **Endpoint:** `POST /ingest`
*   **Description:** Uploads a file (PDF, DOCX, TXT) for processing. The file content is chunked, embedded, stored in a vector database, and optionally used to build/update a knowledge graph in Neo4j.
*   **Request Type:** `multipart/form-data`
*   **Query Parameters:**
    *   `collectionName`
        *   **Type:** `string`
        *   **Optional:** Yes (Defaults to `cognee-collection` as defined in backend config)
        *   **Description:** The name of the ChromaDB collection to use for storing document embeddings.
    *   `buildGraph`
        *   **Type:** `string` (`'true'` or `'false'`)
        *   **Optional:** Yes (Defaults to `'true'`)
        *   **Description:** Specifies whether to extract graph elements from the document and update the Neo4j knowledge graph.
*   **Form Data:**
    *   `file`
        *   **Type:** File
        *   **Required:** Yes
        *   **Description:** The document file to be ingested (PDF, DOCX, or TXT).
*   **Success Response (200 OK):**
    ```json
    {
      "message": "File ingested successfully. Documents processed and added to vector store.",
      "graphProcessing": "Graph building process initiated/completed.", // or "Graph building skipped as per request."
      "filename": "1678886400000-original_filename.txt", // Example server-generated filename
      "originalName": "original_filename.txt",
      "documentsProcessed": 10, // Number of LangChain documents/chunks created
      "vectorCollection": "cognee-collection"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`:
        *   If no file is uploaded: `{"message": "No file uploaded."}`
        *   If file processing yields no documents: `{"message": "File processed, but no content could be extracted into documents."}`
    *   `500 Internal Server Error`: If any other error occurs during processing.
        ```json
        { "message": "Error processing file.", "error": "Detailed error message from the server." }
        ```
*   **Example cURL:**
    ```bash
    curl -X POST "http://localhost:3001/ingest?collectionName=my_collection&buildGraph=true" \
         -F "file=@/path/to/your/document.pdf"
    ```

---

### 2. Query / Chat

*   **Endpoint:** `POST /query`
*   **Description:** Sends a question to the RAG (Retrieval Augmented Generation) system. Can handle conversational history and optionally use the knowledge graph. Returns a Server-Sent Events (SSE) stream for real-time responses.
*   **Request Body (JSON):**
    *   `question`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** The user's question or prompt.
    *   `sessionId`:
        *   **Type:** `string`
        *   **Optional:** Yes
        *   **Description:** A client-managed session ID. If not provided, the backend generates a new UUID v4 session ID and returns it in the `X-Session-Id` response header (for the initial part of the SSE connection, not on every event). User and AI messages for this query will be saved under this session.
    *   `collectionName`:
        *   **Type:** `string`
        *   **Optional:** Yes (Defaults to `cognee-collection`)
        *   **Description:** The ChromaDB collection to retrieve context from.
    *   `chat_history`:
        *   **Type:** `Array<object>`
        *   **Optional:** Yes
        *   **Description:** An array of previous messages in LangChain format for conversational context. Each object should have `type` (`"human"` or `"ai"`) and `content` (`string`).
        *   **Example:** `[{"type": "human", "content": "What is Neo4j?"}, {"type": "ai", "content": "Neo4j is a graph database."}]`
    *   `use_knowledge_graph`:
        *   **Type:** `boolean`
        *   **Optional:** Yes (Defaults to `false`)
        *   **Description:** If true, the system will attempt to query the knowledge graph for relevant context in addition to the vector store.
    *   `chatModelName`:
        *   **Type:** `string`
        *   **Optional:** Yes
        *   **Description:** Specific chat model name to use for this query (e.g., "gemini-pro", "gemini-ultra"). If not provided, uses the backend's default chat model (see LLM Configuration section).
*   **Success Response (200 OK with SSE Stream):**
    *   `Content-Type: text/event-stream`
    *   The stream sends multiple `data:` events, each typically a JSON string. Key event `type`s within the JSON:
        *   `token`: A chunk of the AI's generated answer.
        *   `kg_context`: Contains context retrieved from the knowledge graph (if `use_knowledge_graph` was true).
        *   `source_documents`: Contains context retrieved from the vector store.
        *   `final_answer`: The complete assembled answer from the AI.
        *   `completed`: Indicates the stream has finished.
    *   **Example Events:**
        ```
        data: {"token":"The answer is "}
        data: {"token":"42."}
        data: {"type":"final_answer","content":"The answer is 42."}
        data: {"type":"completed","message":"Query processing completed."}
        ```
    *   **Headers:** May include `X-Session-Id: <generated_session_id>` if a new session was created by the backend.
*   **Error Responses:**
    *   `400 Bad Request`: If `question` is missing or not a string.
        ```json
        { "message": "Validation error: question is required and must be a string." }
        ```
    *   `500 Internal Server Error`: If an error occurs before the SSE stream starts.
        ```json
        { "message": "Error processing your query.", "error": "Detailed error message." }
        ```
    *   If an error occurs *during* streaming, an SSE event like `data: {"type": "error", "content": "Error message..."}` may be sent, followed by a `completed` event.
*   **Example cURL (Note: `curl` will show raw SSE stream):**
    ```bash
    curl -X POST "http://localhost:3001/query" \
         -H "Content-Type: application/json" \
         -d '{
               "question": "What is the capital of France?",
               "sessionId": "my-custom-session-id-123",
               "use_knowledge_graph": true
             }' \
         --no-buffer
    ```

---

### 3. Graph Schema Summary

*   **Endpoint:** `GET /graph-schema`
*   **Description:** Retrieves a summary of the Neo4j graph schema, including all unique node labels, relationship types, and property keys present in the database.
*   **Request Parameters:** None
*   **Success Response (200 OK):**
    *   **Content:** A JSON object containing arrays of strings for node labels, relationship types, and property keys.
    ```json
    {
      "nodeLabels": ["Person", "Document", "Organization", "Resource", "ChatSession", "ChatMessage", "SavedPrompt"],
      "relationshipTypes": ["HAS_MESSAGE", "NEXT_MESSAGE", "KNOWS", "WORKS_AT", "FOUNDED_BY"],
      "propertyKeys": ["name", "id", "text", "timestamp", "nodeType", "createdAt", "promptId", "messageId", "type", "sessionId", "question", "answer", "pageContent", "source"]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`: If there's an issue querying the database schema.
        ```json
        { "message": "Failed to fetch graph schema", "error": "Detailed error from Neo4j driver or server." }
        ```
*   **Example cURL:**
    ```bash
    curl -X GET "http://localhost:3001/graph-schema"
    ```

---

### 4. Query Knowledge Graph (Natural Language)

*   **Endpoint:** `POST /query-graph`
*   **Description:** Accepts a natural language question, which the backend attempts to convert into a Cypher query using an LLM. The generated Cypher query is then executed against the Neo4j knowledge graph.
*   **Request Body (JSON):**
    *   `question`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** The natural language question to query the graph.
*   **Success Response (200 OK):**
    *   **Content:** An array of objects. Each object represents a row (record) returned by the executed Cypher query. The structure of these objects will vary depending on what the generated Cypher query returns.
    *   **Example (if query returns nodes with 'name' and 'type' properties):**
        ```json
        [
          { "name": "Specific Entity Name", "type": "Concept" },
          { "name": "Another Entity", "type": "Person" }
        ]
        ```
    *   **If LLM cannot generate a valid query:** The array might contain a warning object.
        ```json
        [{ "warning": "Could not translate question to a graph query.", "query": "Attempted or failed Cypher query from LLM" }]
        ```
*   **Error Responses:**
    *   `400 Bad Request`: If the `question` field is missing from the request body.
        ```json
        { "message": "Question is required." }
        ```
    *   `500 Internal Server Error`: If there's an error during LLM interaction, Cypher generation, or query execution.
        ```json
        { "message": "Failed to query graph.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    ```bash
    curl -X POST "http://localhost:3001/query-graph" \
         -H "Content-Type: application/json" \
         -d '{"question": "Show me all documents related to climate change."}'
    ```

---

### 5. Graph Overview for Visualization

*   **Endpoint:** `GET /graph/overview`
*   **Description:** Fetches a general set of nodes and their relationships for an initial graph visualization, or nodes/relationships matching a search term. Data is structured for use with graph visualization libraries like `react-force-graph-2d`.
*   **Query Parameters:**
    *   `searchTerm`:
        *   **Type:** `string`
        *   **Optional:** Yes
        *   **Description:** A term used to search for nodes. The backend typically searches against node properties like `name`, `id`, or `nodeType`.
    *   `limit`:
        *   **Type:** `number`
        *   **Optional:** Yes (Defaults to `50`)
        *   **Description:** The maximum number of nodes/relationships to return.
*   **Success Response (200 OK):**
    *   **Content:** A JSON object with `nodes` and `links` arrays.
    ```json
    {
      "nodes": [
        { "id": "node1_id", "name": "Node 1", "labels": ["LabelA"], "properties": {"description": "Details about Node 1"} },
        { "id": "node2_id", "name": "Node 2", "labels": ["LabelB"], "properties": {"value": 100} }
      ],
      "links": [
        { "source": "node1_id", "target": "node2_id", "type": "CONNECTED_TO", "properties": {"weight": 10} }
      ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If the `limit` parameter is not a positive integer.
        ```json
        { "message": "Invalid limit parameter. Must be a positive integer." }
        ```
    *   `500 Internal Server Error`: If there's an issue querying the database.
        ```json
        { "message": "Failed to fetch graph overview.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    *   **General Overview:**
        ```bash
        curl -X GET "http://localhost:3001/graph/overview?limit=20"
        ```
    *   **With Search Term:**
        ```bash
        curl -X GET "http://localhost:3001/graph/overview?searchTerm=ProjectX&limit=10"
        ```

---

### 6. Node Neighbors for Visualization

*   **Endpoint:** `GET /graph/node/:id/neighbors`
*   **Description:** Fetches a specific node (identified by its `id` property) and its immediate neighbors, along with the relationships connecting them. Data is structured for graph visualization.
*   **Path Parameters:**
    *   `id`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** The `id` property of the central node for which to fetch neighbors. This typically corresponds to the `id` field set during graph element creation (e.g., from `GraphElements` interface).
*   **Success Response (200 OK):**
    *   **Content:** A JSON object with `nodes` and `links` arrays, including the central node and its neighbors.
    ```json
    {
      "nodes": [
        { "id": "center_node_id", "name": "Center Node", "labels": ["CentralType"], "properties": {} },
        { "id": "neighbor1_id", "name": "Neighbor Node 1", "labels": ["NeighborType"], "properties": {} }
      ],
      "links": [
        { "source": "center_node_id", "target": "neighbor1_id", "type": "HAS_NEIGHBOR", "properties": {} }
      ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If the `id` path parameter is missing (though typically Express routing would result in a 404 for a malformed path).
    *   `404 Not Found`: If no node with the given `id` is found in the database, or if it's found but has no connections (and the query implementation doesn't return the node itself in such cases - current backend implementation *does* return the node itself if found, so 404 primarily means node not found).
        ```json
        { "message": "Node with ID 'non_existent_id' not found or has no connections." }
        ```
    *   `500 Internal Server Error`: If there's an issue querying the database.
        ```json
        { "message": "Failed to fetch neighbors for node non_existent_id.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    ```bash
    curl -X GET "http://localhost:3001/graph/node/some_node_id_property/neighbors"
    ```

---

### 7. Chat History

*   **Endpoint:** `GET /chat/history/:sessionId`
*   **Description:** Retrieves all chat messages for a given session ID, ordered by timestamp.
*   **Path Parameters:**
    *   `sessionId`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** The unique identifier for the chat session.
*   **Success Response (200 OK):**
    *   **Content:** An array of chat message objects. Each object contains `id` (messageId), `type` ('user' or 'ai'), `text`, and `timestamp`.
    ```json
    [
      { "id": "user-1678886400000", "type": "user", "text": "Hello", "timestamp": "2023-03-15T12:00:00.000Z" },
      { "id": "ai-1678886405000", "type": "ai", "text": "Hi there! How can I help you today?", "timestamp": "2023-03-15T12:00:05.000Z" }
    ]
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `sessionId` is not provided in the path.
        ```json
        { "message": "Session ID is required." }
        ```
    *   `500 Internal Server Error`: If there's an issue retrieving history from the database.
        ```json
        { "message": "Failed to fetch chat history.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    ```bash
    curl -X GET "http://localhost:3001/chat/history/your-session-id-here"
    ```

*   **Endpoint:** `DELETE /chat/history/:sessionId`
*   **Description:** Deletes the entire chat history (all messages and the session node itself) for a given session ID.
*   **Path Parameters:**
    *   `sessionId`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** The unique identifier of the chat session to delete.
*   **Success Response (204 No Content):**
    *   Empty body, indicating successful deletion.
*   **Error Responses:**
    *   `400 Bad Request`: If `sessionId` is not provided in the path.
        ```json
        { "message": "Session ID is required for deletion." }
        ```
    *   `404 Not Found`: If no chat session with the given `sessionId` is found. (Note: The backend might not explicitly check for existence before attempting delete, a successful empty delete might also result in 204. Behavior depends on DB response if session doesn't exist).
        ```json
        { "message": "Chat history for session ID 'some_id' not found." }
        ```
    *   `500 Internal Server Error`: If there's an issue deleting the history from the database.
        ```json
        { "message": "Failed to delete chat history.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    ```bash
    curl -X DELETE "http://localhost:3001/chat/history/your-session-id-to-delete"
    ```

---

### 8. Saved Prompts

*   **Endpoint:** `POST /prompts`
*   **Description:** Saves a new user-defined prompt to the database.
*   **Request Body (JSON):**
    *   `name`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** A user-friendly name for the prompt.
    *   `text`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** The actual text content of the prompt.
*   **Success Response (201 Created):**
    *   **Content:** The saved prompt object, including its backend-generated `promptId` and `createdAt` timestamp.
    ```json
    {
      "promptId": "generated-uuid-for-prompt",
      "name": "My Custom Prompt Name",
      "text": "This is the detailed text of my custom prompt.",
      "createdAt": "2023-03-15T14:30:00.000Z"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `name` or `text` fields are missing or not strings.
        ```json
        { "message": "Validation error: name and text are required and must be strings." }
        ```
    *   `500 Internal Server Error`: If there's an issue saving the prompt to the database.
        ```json
        { "message": "Failed to save prompt.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    ```bash
    curl -X POST "http://localhost:3001/prompts" \
         -H "Content-Type: application/json" \
         -d '{"name": "Explain Complexity", "text": "Explain the concept of Big O notation in simple terms."}'
    ```

*   **Endpoint:** `GET /prompts`
*   **Description:** Retrieves all saved user-defined prompts, ordered by creation date (most recent first).
*   **Request Parameters:** None
*   **Success Response (200 OK):**
    *   **Content:** An array of saved prompt objects.
    ```json
    [
      {
        "promptId": "uuid-2",
        "name": "Recent Prompt",
        "text": "Text for recent prompt.",
        "createdAt": "2023-03-15T11:00:00.000Z"
      },
      {
        "promptId": "uuid-1",
        "name": "Older Prompt",
        "text": "Text for older prompt.",
        "createdAt": "2023-03-15T10:00:00.000Z"
      }
    ]
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`: If there's an issue fetching prompts from the database.
        ```json
        { "message": "Failed to fetch saved prompts.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    ```bash
    curl -X GET "http://localhost:3001/prompts"
    ```

*   **Endpoint:** `DELETE /prompts/:promptId`
*   **Description:** Deletes a specific saved prompt by its `promptId`.
*   **Path Parameters:**
    *   `promptId`:
        *   **Type:** `string`
        *   **Required:** Yes
        *   **Description:** The unique identifier of the prompt to delete.
*   **Success Response (204 No Content):**
    *   Empty body, indicating successful deletion.
*   **Error Responses:**
    *   `400 Bad Request`: If `promptId` is missing (though typically caught by routing if path is malformed).
    *   `404 Not Found`: If no prompt with the given `promptId` is found.
        ```json
        { "message": "Prompt with ID 'some_id' not found." }
        ```
    *   `500 Internal Server Error`: If there's an issue deleting the prompt from the database.
        ```json
        { "message": "Failed to delete prompt some_id.", "error": "Detailed error message." }
        ```
*   **Example cURL:**
    ```bash
    curl -X DELETE "http://localhost:3001/prompts/your-prompt-id-here"
    ```

---
