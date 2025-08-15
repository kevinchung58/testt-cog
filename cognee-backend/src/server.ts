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
  deleteChatHistory,
  saveUserPrompt,
  getSavedPrompts,
  deleteSavedPrompt
} from './toolkit/graph-builder';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';

// Clerk SDK for backend authentication
import { ClerkExpressRequireAuth, clerkClient, StrictAuthProp } from '@clerk/clerk-sdk-node';
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Cognee Backend (LangChain Integrated) is running!');
});

// All the existing, non-LMS routes remain untouched.
// ... /ingest, /query, /graph-schema, etc.

// Extend the Express Request type to include the auth property
declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

// --- User Management API (Admin only) ---
const adminRouter = express.Router();

// Define a custom middleware for checking for admin role
const isAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const { sessionClaims } = req.auth;
  if (sessionClaims?.metadata.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Access requires admin privileges.' });
  }
  next();
};

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

// Mount the admin router under the /api path
app.use('/api', adminRouter);


// Only start the server if this file is executed directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server (LangChain Integrated) listening on port ${port}`);
  });
}

export default app;
