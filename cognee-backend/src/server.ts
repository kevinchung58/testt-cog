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
  deleteSavedPrompt,
  executeCypherQuery
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

// --- Course & Lesson Management API ---
const courseRouter = express.Router();
courseRouter.use(ClerkExpressRequireAuth()); // All course/lesson routes require authentication

// Middleware to check for admin or teacher roles
const isTeacherOrAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const { sessionClaims } = req.auth;
  const role = sessionClaims?.metadata.role;
  if (role !== 'admin' && role !== 'teacher') {
    return res.status(403).json({ message: 'Forbidden: Access requires admin or teacher privileges.' });
  }
  next();
};

// Middleware to check if the requester is the course owner or an admin
const isCourseOwner = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const { sessionClaims } = req.auth;
    const { courseId } = req.params;
    if (sessionClaims?.metadata.role === 'admin') return next();
    try {
        const result = await executeCypherQuery(`MATCH (c:Course {courseId: $courseId}) RETURN c.authorId AS authorId`, { courseId });
        if (result.records.length === 0) return res.status(404).json({ message: 'Course not found.' });
        if (result.records[0].get('authorId') === sessionClaims?.sub) return next();
        return res.status(403).json({ message: 'Forbidden: You do not have permission to modify this course.' });
    } catch (error: any) {
        console.error('Error in isCourseOwner middleware:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// Middleware to check if the requester is enrolled, the course owner, or an admin
const isEnrolledOrOwner = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const { sessionClaims } = req.auth;
    const { courseId } = req.params;
    const userId = sessionClaims?.sub;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });
    if (sessionClaims?.metadata.role === 'admin') return next();
    try {
        const result = await executeCypherQuery(`MATCH (c:Course {courseId: $courseId}) OPTIONAL MATCH (u:User {id: $userId})-[:ENROLLED_IN]->(c) RETURN c.authorId AS authorId, u IS NOT NULL AS isEnrolled`, { courseId, userId });
        if (result.records.length === 0) return res.status(404).json({ message: 'Course not found.' });
        const { authorId, isEnrolled } = result.records[0].toObject();
        if (authorId === userId || isEnrolled) return next();
        return res.status(403).json({ message: 'Forbidden: You do not have permission to view these lessons.' });
    } catch (error: any) {
        console.error('Error in isEnrolledOrOwner middleware:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// Course Endpoints
courseRouter.post('/courses', isTeacherOrAdmin, async (req, res) => {
    const { title, description } = req.body;
    const { userId: authorId } = req.auth;
    if (!title || !description || !authorId) return res.status(400).json({ message: 'Title and description are required.' });
    const courseId = uuidv4();
    try {
        await executeCypherQuery(`CREATE (c:Course { courseId: $courseId, title: $title, description: $description, authorId: $authorId, createdAt: datetime() })`, { courseId, title, description, authorId });
        res.status(201).json({ courseId, title, description, authorId });
    } catch (error: any) {
        console.error('Error creating course:', error.message);
        res.status(500).json({ message: 'Failed to create course.' });
    }
});

courseRouter.get('/courses', ClerkExpressRequireAuth({}), async (req, res) => {
    try {
        const result = await executeCypherQuery('MATCH (c:Course) RETURN c ORDER BY c.createdAt DESC');
        const courses = result.records.map(record => record.get('c').properties);
        res.json(courses);
    } catch (error: any) {
        console.error('Error fetching courses:', error.message);
        res.status(500).json({ message: 'Failed to fetch courses.' });
    }
});

courseRouter.post('/courses/:courseId/enroll', ClerkExpressRequireAuth({}), async (req, res) => {
    const { courseId } = req.params;
    const { userId } = req.auth;
    if (!courseId || !userId) return res.status(400).json({ message: 'Course ID and User ID are required.' });
    try {
        await executeCypherQuery(`MERGE (user:User {id: $userId}) ON CREATE SET user.createdAt = datetime() WITH user MATCH (course:Course {courseId: $courseId}) MERGE (user)-[:ENROLLED_IN]->(course)`, { userId, courseId });
        res.status(200).json({ message: 'Successfully enrolled in course.' });
    } catch (error: any) {
        console.error(`Error enrolling user ${userId} in course ${courseId}:`, error.message);
        res.status(500).json({ message: 'Failed to enroll in course.' });
    }
});

// Lesson Endpoints
courseRouter.get('/courses/:courseId/lessons', isEnrolledOrOwner, async (req, res) => {
    const { courseId } = req.params;
    try {
        const result = await executeCypherQuery(`MATCH (:Course {courseId: $courseId})-[:HAS_LESSON]->(l:Lesson) RETURN l ORDER BY l.order ASC`, { courseId });
        const lessons = result.records.map(record => record.get('l').properties);
        res.json(lessons);
    } catch (error: any) {
        console.error(`Error fetching lessons for course ${courseId}:`, error.message);
        res.status(500).json({ message: 'Failed to fetch lessons.' });
    }
});

courseRouter.post('/courses/:courseId/lessons', isCourseOwner, async (req, res) => {
    const { courseId } = req.params;
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ message: 'Lesson title is required.' });
    const lessonId = uuidv4();
    const orderResult = await executeCypherQuery(`MATCH (c:Course {courseId: $courseId})-[:HAS_LESSON]->(l:Lesson) RETURN count(l) as lessonCount`, { courseId });
    const order = orderResult.records.length > 0 ? orderResult.records[0].get('lessonCount').low : 0;
    try {
        await executeCypherQuery(`MATCH (c:Course {courseId: $courseId}) CREATE (l:Lesson { lessonId: $lessonId, title: $title, content: $content, order: $order, createdAt: datetime() }) CREATE (c)-[:HAS_LESSON]->(l)`, { courseId, lessonId, title, content, order });
        res.status(201).json({ lessonId, title, content, order });
    } catch (error: any) {
        console.error(`Error creating lesson for course ${courseId}:`, error.message);
        res.status(500).json({ message: 'Failed to create lesson.' });
    }
});

// Get courses created by a specific user
adminRouter.get('/users/:userId/courses/created', isSelfOrAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await executeCypherQuery(`MATCH (c:Course {authorId: $userId}) RETURN c ORDER BY c.createdAt DESC`, { userId });
        const courses = result.records.map(record => record.get('c').properties);
        res.json(courses);
    } catch (error: any) {
        console.error(`Error fetching created courses for user ${userId}:`, error.message);
        res.status(500).json({ message: 'Failed to fetch created courses.' });
    }
});

// Get courses a specific user is enrolled in
adminRouter.get('/users/:userId/courses', isSelfOrAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await executeCypherQuery(`MATCH (:User {id: $userId})-[:ENROLLED_IN]->(c:Course) RETURN c ORDER BY c.createdAt DESC`, { userId });
        const courses = result.records.map(record => record.get('c').properties);
        res.json(courses);
    } catch (error: any) {
        console.error(`Error fetching courses for user ${userId}:`, error.message);
        res.status(500).json({ message: 'Failed to fetch enrolled courses.' });
    }
});

app.use('/api', courseRouter);


// Only start the server if this file is executed directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server (LangChain Integrated) listening on port ${port}`);
  });
}

export default app;
