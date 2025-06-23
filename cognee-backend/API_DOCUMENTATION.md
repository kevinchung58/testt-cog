# Cognee Backend API Documentation

This document provides details about the API endpoints available in the Cognee backend service.

## Base URL

The API is typically served from `/` relative to the backend's running port (e.g., `http://localhost:3001`).

## Authentication

Currently, there is no authentication implemented for these endpoints.

---

## Endpoints

### 1. File Ingestion

*   **Endpoint:** `POST /ingest`
*   **Description:** Uploads a file (PDF, DOCX, TXT) for processing. The file content is chunked, embedded, stored in a vector database, and optionally used to build/update a knowledge graph in Neo4j.
*   **Request Type:** `multipart/form-data`
*   **Query Parameters:**
    *   `collectionName` (optional, string): The name of the ChromaDB collection to use. Defaults to `cognee-collection`.
    *   `buildGraph` (optional, string: 'true' or 'false'): Whether to build/update the knowledge graph from the document. Defaults to `'true'`.
*   **Form Data:**
    *   `file`: The file to be uploaded.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "File ingested successfully. Documents processed and added to vector store.",
      "graphProcessing": "Graph building process initiated/completed." // or "Graph building skipped..."
      "filename": "server-generated-filename.txt",
      "originalName": "original_filename.txt",
      "documentsProcessed": 10, // Number of LangChain documents/chunks created
      "vectorCollection": "cognee-collection"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If no file is uploaded, or if the file processes into zero documents.
        ```json
        { "message": "No file uploaded." }
        ```
        ```json
        { "message": "File processed, but no content could be extracted into documents." }
        ```
    *   `500 Internal Server Error`: If any error occurs during processing.
        ```json
        { "message": "Error processing file.", "error": "Specific error message" }
        ```

---

### 2. Query / Chat

*   **Endpoint:** `POST /query`
*   **Description:** Sends a question to the RAG (Retrieval Augmented Generation) system. Can handle conversational history and optionally use the knowledge graph. Returns a Server-Sent Events (SSE) stream.
*   **Request Body (JSON):**
    ```json
    {
      "question": "string (required)",
      "sessionId": "string (optional)", // Client-managed session ID. If not provided, backend generates one and returns in X-Session-Id header.
      "collectionName": "string (optional)", // ChromaDB collection. Defaults to `cognee-collection`.
      "chat_history": [ // LangChain format chat history (optional)
        { "type": "human", "content": "Previous user question" },
        { "type": "ai", "content": "Previous AI answer" }
      ],
      "use_knowledge_graph": "boolean (optional, default: false)"
    }
    ```
*   **Success Response (200 OK with SSE Stream):**
    *   `Content-Type: text/event-stream`
    *   The stream will send multiple events. Key event data structures:
        *   `data: {"token": "some part of the answer"}` (for AI response tokens)
        *   `data: {"type": "kg_context", "content": "Knowledge graph context..."}` (if `use_knowledge_graph` is true and KG results found)
        *   `data: {"type": "source_documents", "content": [{ "pageContent": "...", "metadata": {...} }]}` (retrieved source documents)
        *   `data: {"type": "final_answer", "content": "The complete final answer."}`
        *   `data: {"type": "completed", "message": "Query processing completed."}`
    *   **Headers:** May include `X-Session-Id` if a new session was created by the backend.
*   **Error Responses:**
    *   `400 Bad Request`: If `question` is missing or not a string.
        ```json
        { "message": "Validation error: question is required and must be a string." }
        ```
    *   `500 Internal Server Error`: If an error occurs before the stream starts.
        ```json
        { "message": "Error processing your query.", "error": "Specific error message" }
        ```
    *   If an error occurs during streaming, an event `data: {"type": "error", "content": "Error message..."}` may be sent, followed by a completion event.

---

### 3. Graph Schema Summary

*   **Endpoint:** `GET /graph-schema`
*   **Description:** Retrieves a summary of the Neo4j graph schema (node labels, relationship types, property keys).
*   **Request Body:** None
*   **Success Response (200 OK):**
    ```json
    {
      "nodeLabels": ["Label1", "Label2"],
      "relationshipTypes": ["REL_TYPE1", "REL_TYPE2"],
      "propertyKeys": ["prop1", "prop2", "name", "id"]
    }
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to fetch graph schema", "error": "Specific error message" }
        ```

---

### 4. Query Knowledge Graph (Natural Language)

*   **Endpoint:** `POST /query-graph`
*   **Description:** Sends a natural language question to be translated into a Cypher query and executed against the knowledge graph.
*   **Request Body (JSON):**
    ```json
    {
      "question": "string (required)"
    }
    ```
*   **Success Response (200 OK):**
    *   An array of objects, where each object represents a record returned by the Cypher query. The structure depends on the query generated.
    ```json
    [
      { "name": "Node Name", "property": "value" },
      // ... other records
    ]
    ```
    *   If LLM cannot generate a query: `[{ "warning": "Could not translate question to a graph query.", "query": "LLM response" }]`
*   **Error Responses:**
    *   `400 Bad Request`: If `question` is missing.
        ```json
        { "message": "Question is required." }
        ```
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to query graph.", "error": "Specific error message" }
        ```

---

### 5. Graph Overview for Visualization

*   **Endpoint:** `GET /graph/overview`
*   **Description:** Fetches a general view of the graph or a view filtered by a search term, formatted for frontend visualization.
*   **Query Parameters:**
    *   `searchTerm` (optional, string): Term to filter nodes by (e.g., matching name, ID, or nodeType).
    *   `limit` (optional, number): Maximum number of nodes/relationships to return. Defaults to 50.
*   **Success Response (200 OK):**
    ```json
    {
      "nodes": [
        { "id": "node1_id", "name": "Node 1", "labels": ["LabelA"], "properties": {"prop": "val"} }
      ],
      "links": [
        { "source": "node1_id", "target": "node2_id", "type": "REL_TYPE" }
      ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `limit` is invalid.
        ```json
        { "message": "Invalid limit parameter. Must be a positive integer." }
        ```
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to fetch graph overview.", "error": "Specific error message" }
        ```

---

### 6. Node Neighbors for Visualization

*   **Endpoint:** `GET /graph/node/:id/neighbors`
*   **Description:** Fetches a specific node and its immediate neighbors, formatted for frontend visualization.
*   **Path Parameters:**
    *   `id` (string, required): The ID of the central node (must match the `id` property stored on the node in Neo4j).
*   **Success Response (200 OK):**
    ```json
    {
      "nodes": [
        { "id": "center_node_id", "name": "Center Node", ... },
        { "id": "neighbor1_id", "name": "Neighbor 1", ... }
      ],
      "links": [
        { "source": "center_node_id", "target": "neighbor1_id", "type": "REL_TYPE" }
      ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `id` is missing (though typically caught by routing).
    *   `404 Not Found`: If the node with the given ID is not found or has no connections.
        ```json
        { "message": "Node with ID 'some_id' not found or has no connections." }
        ```
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to fetch neighbors for node some_id.", "error": "Specific error message" }
        ```

---

### 7. Chat History

*   **Endpoint:** `GET /chat/history/:sessionId`
*   **Description:** Retrieves the chat history for a given session ID.
*   **Path Parameters:**
    *   `sessionId` (string, required): The ID of the chat session.
*   **Success Response (200 OK):**
    ```json
    [
      { "id": "msg1_id", "type": "user", "text": "Hello", "timestamp": "2023-01-01T12:00:00.000Z" },
      { "id": "msg2_id", "type": "ai", "text": "Hi there!", "timestamp": "2023-01-01T12:00:05.000Z" }
    ]
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `sessionId` is missing.
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to fetch chat history.", "error": "Specific error message" }
        ```

*   **Endpoint:** `DELETE /chat/history/:sessionId`
*   **Description:** Deletes the entire chat history for a given session ID.
*   **Path Parameters:**
    *   `sessionId` (string, required): The ID of the chat session to delete.
*   **Success Response (204 No Content):**
    *   Empty body.
*   **Error Responses:**
    *   `400 Bad Request`: If `sessionId` is missing.
    *   `404 Not Found`: If the chat history for the session ID is not found.
        ```json
        { "message": "Chat history for session ID some_id not found." }
        ```
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to delete chat history.", "error": "Specific error message" }
        ```

---

### 8. Saved Prompts

*   **Endpoint:** `POST /prompts`
*   **Description:** Saves a new user-defined prompt.
*   **Request Body (JSON):**
    ```json
    {
      "name": "string (required)",
      "text": "string (required)"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "promptId": "generated-uuid",
      "name": "User Prompt Name",
      "text": "The prompt text.",
      "createdAt": "2023-01-01T12:01:00.000Z"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `name` or `text` is missing or invalid.
        ```json
        { "message": "Validation error: name and text are required and must be strings." }
        ```
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to save prompt.", "error": "Specific error message" }
        ```

*   **Endpoint:** `GET /prompts`
*   **Description:** Retrieves all saved user-defined prompts.
*   **Request Body:** None
*   **Success Response (200 OK):**
    ```json
    [
      {
        "promptId": "uuid-1",
        "name": "Prompt 1",
        "text": "Text for prompt 1",
        "createdAt": "2023-01-01T10:00:00.000Z"
      },
      {
        "promptId": "uuid-2",
        "name": "Prompt 2",
        "text": "Text for prompt 2",
        "createdAt": "2023-01-01T11:00:00.000Z"
      }
    ]
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to fetch saved prompts.", "error": "Specific error message" }
        ```

*   **Endpoint:** `DELETE /prompts/:promptId`
*   **Description:** Deletes a specific saved prompt by its ID.
*   **Path Parameters:**
    *   `promptId` (string, required): The ID of the prompt to delete.
*   **Success Response (204 No Content):**
    *   Empty body.
*   **Error Responses:**
    *   `400 Bad Request`: If `promptId` is missing (typically caught by routing).
    *   `404 Not Found`: If the prompt with the given ID is not found.
        ```json
        { "message": "Prompt with ID some_id not found." }
        ```
    *   `500 Internal Server Error`:
        ```json
        { "message": "Failed to delete prompt some_id.", "error": "Specific error message" }
        ```

---
