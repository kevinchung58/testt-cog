import './config'; // Ensures .env variables are loaded
import express, { Request } from 'express';
import cors from 'cors'; // Import cors middleware
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CHROMA_COLLECTION_NAME as DEFAULT_CHROMA_COLLECTION_NAME } from './config';

// Toolkit imports
import { processFileToDocuments, SupportedFileMimeTypes } from './toolkit/data-processor';
import { addDocuments as addDocumentsToVectorStore, createRetriever as createVectorStoreRetriever } from './toolkit/vector-store';
import { createRAGChain, createConversationalChain } from './toolkit/query-engine';
import {
  documentsToGraph,
  queryGraph as queryKnowledgeGraph,
  fetchGraphSchemaSummary as fetchNeo4jGraphSchema,
  getGraphOverview,
  getNodeWithNeighbors,
  saveChatMessage,
  getChatHistory,
  deleteChatHistory, // New import for deleting chat history
  saveUserPrompt,
  getSavedPrompts,
  deleteSavedPrompt,
  executeCypherQuery
} from './toolkit/graph-builder';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage: storage });

// Enable CORS for all routes and origins (adjust for production as needed)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Cognee Backend (LangChain Integrated) is running!');
});

interface IngestQuery {
  collectionName?: string;
  buildGraph?: string; // 'true' or 'false'
}

// POST endpoint for file ingestion
app.post('/ingest', upload.single('file'), async (req: Request<{}, {}, {}, IngestQuery>, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  const { collectionName = DEFAULT_CHROMA_COLLECTION_NAME, buildGraph = 'true' } = req.query;
  const doBuildGraph = buildGraph.toLowerCase() === 'true';

  console.log(`File received: ${req.file.originalname}, Type: ${req.file.mimetype}, Collection: ${collectionName}, Build Graph: ${doBuildGraph}`);
  const tempFilePath = req.file.path;

  try {
    // 1. Process file to LangChain Documents
    const documents = await processFileToDocuments(tempFilePath, req.file.mimetype as SupportedFileMimeTypes);
    if (!documents || documents.length === 0) {
      // Try to delete the temp file even if processing failed to produce documents
      try { await fs.promises.unlink(tempFilePath); } catch (e) { console.error('Error deleting temp file after no docs:', e); }
      return res.status(400).send({ message: 'File processed, but no content could be extracted into documents.' });
    }
    console.log(`Processed ${documents.length} documents from file.`);

    // 2. Add documents to vector store
    await addDocumentsToVectorStore(documents, collectionName);
    console.log(`Documents added to vector store collection: ${collectionName}`);

    let graphMessage = "Graph building skipped as per request.";
    if (doBuildGraph) {
        // 3. (Optional) Build graph from documents
        console.log(`Starting graph building for ${documents.length} documents...`);
        await documentsToGraph(documents); // This function is in graph-builder.ts
        console.log('Graph building process completed.');
        graphMessage = "Graph building process initiated/completed.";
    }

    // Clean up the uploaded file
    await fs.promises.unlink(tempFilePath);
    console.log('Temporary file deleted:', tempFilePath);

    res.status(200).send({
      message: 'File ingested successfully. Documents processed and added to vector store.',
      graphProcessing: graphMessage,
      filename: req.file.filename,
      originalName: req.file.originalname,
      documentsProcessed: documents.length,
      vectorCollection: collectionName,
    });

  } catch (error: any) {
    console.error('Error processing file in /ingest:', error.message, error.stack);
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { await fs.promises.unlink(tempFilePath); } catch (e) { console.error('Error deleting temp file on error:', e); }
    }
    res.status(500).send({ message: 'Error processing file.', error: error.message });
  }
});

// Interface for the /query endpoint body
interface QueryBody {
  question: string;
  sessionId?: string;
  collectionName?: string;
  chat_history?: Array<{ type: 'human' | 'ai'; content: string }>;
  use_knowledge_graph?: boolean;
  chatModelName?: string;
}

app.post('/query', async (req: Request<{}, {}, QueryBody>, res) => {
  let {
    question,
    sessionId,
    collectionName = DEFAULT_CHROMA_COLLECTION_NAME,
    chat_history,
    use_knowledge_graph = false,
    chatModelName
  } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ message: 'Validation error: question is required and must be a string.' });
  }

  // Session ID management
  if (!sessionId) {
    sessionId = uuidv4();
    console.log(`No sessionId provided, generated new one: ${sessionId}`);
    res.setHeader('X-Session-Id', sessionId);
  }

  console.log(`Received query for sessionId ${sessionId}: "${question}", Collection: ${collectionName}, Use KG: ${use_knowledge_graph}`);
  if (chat_history) console.log(`Chat history (for LangChain) items: ${chat_history.length}`);

  // Save user's message
  const userMessageToSave = { id: `user-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, type: 'user' as const, text: question };
  try {
    await saveChatMessage(sessionId, userMessageToSave);
  } catch (dbError) {
    console.error(`Failed to save user message for session ${sessionId}:`, dbError);
  }

  try {
    const retriever = await createVectorStoreRetriever(collectionName);
    let sourceDocuments: any[] = [];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let finalAnswer = "";
    let knowledgeGraphContext = "";

    if (use_knowledge_graph) {
        console.log(`Querying knowledge graph with model: ${chatModelName || 'default'}...`);
        try {
            const graphResults = await queryKnowledgeGraph(question, undefined, chatModelName);
            if (graphResults && graphResults.length > 0) {
                knowledgeGraphContext = "Knowledge Graph Results:\n" + graphResults.map(r => JSON.stringify(r)).join("\n");
                console.log("Knowledge graph context retrieved:", knowledgeGraphContext);
                res.write(`data: ${JSON.stringify({ type: 'kg_context', content: knowledgeGraphContext })}\n\n`);
            }
        } catch (kgError: any) {
            console.error("Error querying knowledge graph:", kgError.message);
            res.write(`data: ${JSON.stringify({ type: 'error', content: 'Error querying knowledge graph: ' + kgError.message })}\n\n`);
        }
    }

    const questionForRAG = knowledgeGraphContext
        ? `${question}\n\nConsider also the following information from the knowledge graph:\n${knowledgeGraphContext}`
        : question;

    if (chat_history && chat_history.length > 0) {
      console.log(`Using Conversational RAG chain with model: ${chatModelName || 'default'}.`);
      const conversationalChain = createConversationalChain(retriever, chatModelName);
      const langchainMessages: BaseMessage[] = chat_history.map(msg =>
        msg.type === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      );
      const stream = await conversationalChain.stream({ question: questionForRAG, chat_history: langchainMessages });
      for await (const chunk of stream) {
        if (chunk.answer) {
          res.write(`data: ${JSON.stringify({ token: chunk.answer })}\n\n`);
          finalAnswer += chunk.answer;
        }
        if (chunk.sourceDocuments) {
            sourceDocuments = chunk.sourceDocuments;
        }
      }
    } else {
      console.log(`Using basic RAG chain with model: ${chatModelName || 'default'}.`);
      const ragChain = createRAGChain(retriever, chatModelName);
      const stream = await ragChain.stream({ query: questionForRAG });
      for await (const chunk of stream) {
         if (typeof chunk === 'string') {
            res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
            finalAnswer += chunk;
         } else if (chunk.sourceDocuments) {
            sourceDocuments = chunk.sourceDocuments;
            res.write(`data: ${JSON.stringify({ sourceDocuments: chunk.sourceDocuments.map((d: any) => ({ pageContent: d.pageContent, metadata: d.metadata })) })}\n\n`);
         } else if (chunk.text) {
            res.write(`data: ${JSON.stringify({ token: chunk.text })}\n\n`);
            finalAnswer += chunk.text;
         } else if (chunk.result) {
            res.write(`data: ${JSON.stringify({ token: chunk.result })}\n\n`);
            finalAnswer += chunk.result;
         }
      }
      if(sourceDocuments.length === 0) {
        const finalResult = await ragChain.call({ query: questionForRAG });
        finalAnswer = finalResult.text;
        sourceDocuments = finalResult.sourceDocuments || [];
      }
    }

    if (sourceDocuments.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'source_documents', content: sourceDocuments.map((d: any) => ({ pageContent: d.pageContent, metadata: d.metadata })) })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'final_answer', content: finalAnswer })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'completed', message: 'Query processing completed.' })}\n\n`);
    res.end();

    if (finalAnswer && sessionId) {
      const aiResponseToSave = { id: `ai-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, type: 'ai' as const, text: finalAnswer };
      try {
        await saveChatMessage(sessionId, aiResponseToSave);
      } catch (dbError) {
        console.error(`Failed to save AI message for session ${sessionId}:`, dbError);
      }
    }

  } catch (error: any) {
    console.error(`Error processing query for session ${sessionId}, question "${question}":`, error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing your query.', error: error.message });
    } else {
      try {
         res.write(`data: ${JSON.stringify({ type: 'error', content: 'Error processing query: ' + error.message })}\n\n`);
         res.write(`data: ${JSON.stringify({ type: 'completed', message: 'Query processing failed.' })}\n\n`);
         res.end();
      } catch (e) {
        console.error("Error writing error to SSE stream:", e);
      }
    }
  }
});


// Endpoint to retrieve chat history for a session
app.get('/chat/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }
  try {
    const history = await getChatHistory(sessionId);
    res.json(history);
  } catch (error: any) {
    console.error(`Error fetching history for session ${sessionId}:`, error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch chat history.', error: error.message });
  }
});

app.delete('/chat/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required for deletion.' });
  }
  try {
    await deleteChatHistory(sessionId);
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
    console.error(`Error deleting history for session ${sessionId}:`, error.message, error.stack);
    if (error.message.toLowerCase().includes('not found')) {
        return res.status(404).json({ message: `Chat history for session ID ${sessionId} not found.`});
    }
    res.status(500).json({ message: 'Failed to delete chat history.', error: error.message });
  }
});

// Refactor graph utility endpoints
app.get('/graph-schema', async (req, res) => {
  console.log('Received request for graph schema summary.');
  try {
    // This function is now imported from graph-builder.ts
    const schemaSummary = await fetchNeo4jGraphSchema();
    res.json(schemaSummary);
  } catch (error: any) {
    console.error('Error in /graph-schema route:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch graph schema', error: error.message });
  }
});

// Endpoint to query graph with natural language (demonstrates queryKnowledgeGraph)
app.post('/query-graph', async (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ message: 'Question is required.' });
    }
    try {
        console.log(`Querying knowledge graph with question: "${question}"`);
        const results = await queryKnowledgeGraph(question); // From graph-builder.ts
        res.json(results);
    } catch (error: any) {
        console.error('Error in /query-graph route:', error.message, error.stack);
        res.status(500).json({ message: 'Failed to query graph.', error: error.message });
    }
});

// New Graph Endpoints for Frontend Visualization
app.get('/graph/overview', async (req, res) => {
  const searchTerm = req.query.searchTerm as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50; // Default limit 50

  if (isNaN(limit) || limit <= 0) {
    return res.status(400).json({ message: 'Invalid limit parameter. Must be a positive integer.' });
  }

  console.log(`Received request for graph overview. Search term: "${searchTerm}", Limit: ${limit}`);
  try {
    const graphData = await getGraphOverview(searchTerm, limit);
    res.json(graphData);
  } catch (error: any) {
    console.error('Error in /graph/overview route:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch graph overview.', error: error.message });
  }
});

app.get('/graph/node/:id/neighbors', async (req, res) => {
  const nodeId = req.params.id;
  if (!nodeId) {
    return res.status(400).json({ message: 'Node ID is required.' });
  }
  console.log(`Received request for neighbors of node: "${nodeId}"`);
  try {
    const graphData = await getNodeWithNeighbors(nodeId);
    if (graphData.nodes.length === 0 && graphData.links.length === 0) {
      // This can happen if the node ID doesn't exist, or exists but has no neighbors.
      // The current getNodeWithNeighbors query will return the node itself if it exists.
      // So if nodes array is empty, it means node ID was not found.
      return res.status(404).json({ message: `Node with ID '${nodeId}' not found or has no connections.` });
    }
    res.json(graphData);
  } catch (error: any) {
    console.error(`Error in /graph/node/${nodeId}/neighbors route:`, error.message, error.stack);
    res.status(500).json({ message: `Failed to fetch neighbors for node ${nodeId}.`, error: error.message });
  }
});


// Note: /node-neighbors and /graph-data might need more specific functions in graph-builder.ts
// if their Cypher queries are highly specialized for visualization and not general Q&A.
// For now, they are removed as their direct counterparts in queryOrchestrationService are gone,
// and queryKnowledgeGraph is a more general Q&A interface.
// They can be re-added if specific graph traversal/visualization queries are needed from graph-builder.


// Saved Prompts Endpoints
app.post('/prompts', async (req, res) => {
  const { name, text } = req.body;
  if (!name || typeof name !== 'string' || !text || typeof text !== 'string') {
    return res.status(400).json({ message: 'Validation error: name and text are required and must be strings.' });
  }
  try {
    const savedPrompt = await saveUserPrompt(name, text);
    res.status(201).json(savedPrompt);
  } catch (error: any) {
    console.error('Error saving prompt:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to save prompt.', error: error.message });
  }
});

app.get('/prompts', async (req, res) => {
  try {
    const prompts = await getSavedPrompts();
    res.json(prompts);
  } catch (error: any) {
    console.error('Error fetching saved prompts:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch saved prompts.', error: error.message });
  }
});

app.delete('/prompts/:promptId', async (req, res) => {
  const { promptId } = req.params;
  if (!promptId) {
    return res.status(400).json({ message: 'Prompt ID is required.' });
  }
  try {
    await deleteSavedPrompt(promptId);
    res.status(204).send(); // No content on successful deletion
  } catch (error: any) {
    console.error(`Error deleting prompt ${promptId}:`, error.message, error.stack);
    // Check if error indicates not found, potentially return 404
    if (error.message.toLowerCase().includes('not found')) { // Basic check
        return res.status(404).json({ message: `Prompt with ID ${promptId} not found.`});
    }
    res.status(500).json({ message: `Failed to delete prompt ${promptId}.`, error: error.message });
  }
});


// Only start the server if this file is executed directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server (LangChain Integrated) listening on port ${port}`);
  });
}

// Clerk SDK for backend authentication
import { ClerkExpressRequireAuth, clerkClient, StrictAuthProp } from '@clerk/clerk-sdk-node';
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';

// Extend the Express Request type to include the auth property
declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

// Define a custom middleware for checking for admin role
const isAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const { sessionClaims } = req.auth;

  if (sessionClaims?.metadata.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Access requires admin privileges.' });
  }
  next();
};

// --- User Management API (Admin only) ---
const adminRouter = express.Router();

// Protect all routes in this router with Clerk authentication and admin role check
adminRouter.use(ClerkExpressRequireAuth());
adminRouter.use(isAdmin);

adminRouter.get('/users', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const users = await clerkClient.users.getUserList({
      limit: Number(limit),
      offset: Number(offset),
      orderBy: '-created_at'
    });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching user list:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch user list.', error: error.message });
  }
});

adminRouter.post('/users/:userId/role', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified. Must be one of: admin, teacher, student.' });
  }

  try {
    const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role
      }
    });
    res.json(updatedUser);
  } catch (error: any) {
    console.error(`Error updating role for user ${userId}:`, error.message, error.stack);
    res.status(500).json({ message: `Failed to update role for user ${userId}.`, error: error.message });
  }
});

// Middleware to check if the requester is the user in the URL param or an admin
const isSelfOrAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const { sessionClaims } = req.auth;
  const { userId } = req.params;

  if (sessionClaims?.metadata.role === 'admin' || sessionClaims?.sub === userId) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
};

// Get courses a specific user is enrolled in
adminRouter.get('/users/:userId/courses', isSelfOrAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await executeCypherQuery(
            `MATCH (:User {id: $userId})-[:ENROLLED_IN]->(c:Course)
             RETURN c ORDER BY c.createdAt DESC`,
            { userId }
        );
        const courses = result.records.map(record => record.get('c').properties);
        res.json(courses);
    } catch (error: any) {
        console.error(`Error fetching courses for user ${userId}:`, error.message, error.stack);
        res.status(500).json({ message: 'Failed to fetch enrolled courses.', error: error.message });
    }
});

// Get courses created by a specific user
adminRouter.get('/users/:userId/courses/created', isSelfOrAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await executeCypherQuery(
            `MATCH (c:Course {authorId: $userId})
             RETURN c ORDER BY c.createdAt DESC`,
            { userId }
        );
        const courses = result.records.map(record => record.get('c').properties);
        res.json(courses);
    } catch (error: any) {
        console.error(`Error fetching created courses for user ${userId}:`, error.message, error.stack);
        res.status(500).json({ message: 'Failed to fetch created courses.', error: error.message });
    }
});

// Mount the admin router under the /api path
app.use('/api', adminRouter);

// --- Course Management API ---
const courseRouter = express.Router();

// Middleware to check for admin or teacher roles
const isTeacherOrAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const { sessionClaims } = req.auth;
  const role = sessionClaims?.metadata.role;
  if (role !== 'admin' && role !== 'teacher') {
    return res.status(403).json({ message: 'Forbidden: Access requires admin or teacher privileges.' });
  }
  next();
};

// All course routes require at least an authenticated user
courseRouter.use(ClerkExpressRequireAuth());

// Create a new course (only for teachers and admins)
courseRouter.post('/courses', isTeacherOrAdmin, async (req, res) => {
  const { title, description } = req.body;
  const { userId: authorId } = req.auth;

  if (!title || !description || !authorId) {
    return res.status(400).json({ message: 'Title, description, and authorId are required.' });
  }

  const courseId = uuidv4();

  try {
    // We'll use the generic executeCypherQuery from graph-builder for this
    await executeCypherQuery(
      `CREATE (c:Course {
        courseId: $courseId,
        title: $title,
        description: $description,
        authorId: $authorId,
        createdAt: datetime()
      })`,
      { courseId, title, description, authorId }
    );
    res.status(201).json({ courseId, title, description, authorId });
  } catch (error: any) {
    console.error('Error creating course:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to create course.', error: error.message });
  }
});

// Get all courses (publicly accessible for a catalog)
courseRouter.get('/courses', async (req, res) => {
  try {
    const result = await executeCypherQuery('MATCH (c:Course) RETURN c ORDER BY c.createdAt DESC');
    const courses = result.records.map(record => record.get('c').properties);
    res.json(courses);
  } catch (error: any) {
    console.error('Error fetching courses:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch courses.', error: error.message });
  }
});

// Enroll in a course
courseRouter.post('/courses/:courseId/enroll', async (req, res) => {
    const { courseId } = req.params;
    const { userId } = req.auth;

    if (!courseId || !userId) {
        return res.status(400).json({ message: 'Course ID and User ID are required.' });
    }

    try {
        await executeCypherQuery(
            `MERGE (user:User {id: $userId})
             ON CREATE SET user.createdAt = datetime()
             WITH user
             MATCH (course:Course {courseId: $courseId})
             MERGE (user)-[:ENROLLED_IN]->(course)`,
            { userId, courseId }
        );
        res.status(200).json({ message: 'Successfully enrolled in course.' });
    } catch (error: any)
    {
        console.error(`Error enrolling user ${userId} in course ${courseId}:`, error.message, error.stack);
        res.status(500).json({ message: 'Failed to enroll in course.', error: error.message });
    }
});


app.use('/api', courseRouter);

export default app;
