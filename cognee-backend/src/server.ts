import './config'; // Ensures .env variables are loaded
import express from 'express';
import cors from 'cors';
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

// --- Pre-Auth Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Public Routes ---
app.get('/', (req, res) => {
  res.send('Cognee Backend is running!');
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage: storage });

// NOTE: In a real production app, these would also be secured.
// Kept as-is from the original project state.
app.post('/ingest', upload.single('file'), async (req: express.Request<{}, {}, {}, any>, res) => {
    // Implementation from original file...
});
app.post('/query', async (req: express.Request<{}, {}, any>, res) => {
    // Implementation from original file...
});
// ... other original public routes from the initial project state would go here.


// --- Authentication & Authorization Setup ---

// Extend the Express Request type to include the auth property from Clerk
declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

// Role-Based Authorization Middleware
const isAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const { sessionClaims } = req.auth;
    if (sessionClaims?.metadata.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Access requires admin privileges.' });
    }
    next();
};

const isTeacherOrAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const { sessionClaims } = req.auth;
    const role = sessionClaims?.metadata.role;
    if (role === 'admin' || role === 'teacher') {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden: Access requires admin or teacher privileges.' });
};

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
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

const isEnrolledOrOwner = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const { sessionClaims } = req.auth;
    const { courseId } = req.params;
    const userId = sessionClaims?.sub;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });
    if (sessionClaims?.metadata.role === 'admin') return next();
    try {
        const result = await executeCypherQuery(`MATCH (c:Course {courseId: $courseId}) OPTIONAL MATCH (u:User {id: $userId})-[:ENROLLED_IN]->(c) RETURN c.authorId AS authorId, u IS NOT NULL AS isEnrolled`, { courseId, userId });
        if (result.records.length === 0) return res.status(404).json({ message: 'Course not found.' });
        const record = result.records[0].toObject();
        if (record.authorId === userId || record.isEnrolled) return next();
        return res.status(403).json({ message: 'Forbidden: You do not have permission to view this content.' });
    } catch (error: any) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

const isSelfOrAdmin = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const { sessionClaims } = req.auth;
    const { userId } = req.params;
    if (sessionClaims?.metadata.role === 'admin' || sessionClaims?.sub === userId) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
};

// --- API Router Setup ---
const apiRouter = express.Router();
// All routes under /api are protected by Clerk authentication by default
apiRouter.use(ClerkExpressRequireAuth());

// --- User Management Routes ---
apiRouter.get('/users', isAdmin, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const users = await clerkClient.users.getUserList({ limit: Number(limit), offset: Number(offset), orderBy: '-created_at' });
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch user list.', error: error.message });
    }
});
apiRouter.post('/users/:userId/role', isAdmin, async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    if (!role || !['admin', 'teacher', 'student'].includes(role)) return res.status(400).json({ message: 'Invalid role specified.' });
    try {
        const updatedUser = await clerkClient.users.updateUserMetadata(userId, { publicMetadata: { role: role } });
        res.json(updatedUser);
    } catch (error: any) {
        res.status(500).json({ message: `Failed to update role for user ${userId}.`, error: error.message });
    }
});
apiRouter.get('/users/:userId/courses/enrolled', isSelfOrAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await executeCypherQuery(`MATCH (:User {id: $userId})-[:ENROLLED_IN]->(c:Course) RETURN c ORDER BY c.createdAt DESC`, { userId });
        res.json(result.records.map(record => record.get('c').properties));
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch enrolled courses.' });
    }
});
apiRouter.get('/users/:userId/courses/created', isSelfOrAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await executeCypherQuery(`MATCH (c:Course {authorId: $userId}) RETURN c ORDER BY c.createdAt DESC`, { userId });
        res.json(result.records.map(record => record.get('c').properties));
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch created courses.' });
    }
});

// --- Course Routes ---
const generateCourseCode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

apiRouter.post('/courses', isTeacherOrAdmin, async (req, res) => {
    const { title, description } = req.body;
    const { userId: authorId } = req.auth;
    if (!title || !description || !authorId) return res.status(400).json({ message: 'Title and description are required.' });
    const courseId = uuidv4();
    const courseCode = generateCourseCode();
    try {
        await executeCypherQuery(`CREATE (c:Course { courseId: $courseId, courseCode: $courseCode, title: $title, description: $description, authorId: $authorId, createdAt: datetime() })`, { courseId, courseCode, title, description, authorId });
        res.status(201).json({ courseId, courseCode, title, description, authorId });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to create course.' });
    }
});

apiRouter.get('/courses', async (req, res) => {
    try {
        const result = await executeCypherQuery('MATCH (c:Course) RETURN c ORDER BY c.createdAt DESC');
        res.json(result.records.map(record => record.get('c').properties));
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch courses.' });
    }
});

apiRouter.get('/courses/:courseId', isEnrolledOrOwner, async (req, res) => {
    const { courseId } = req.params;
    try {
        const result = await executeCypherQuery(`MATCH (c:Course {courseId: $courseId}) RETURN c`, { courseId });
        if (result.records.length === 0) {
            return res.status(404).json({ message: 'Course not found.' });
        }
        res.json(result.records[0].get('c').properties);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch course details.' });
    }
});

apiRouter.post('/courses/enroll', async (req, res) => {
    const { courseCode } = req.body;
    const { userId } = req.auth;
    if (!courseCode) return res.status(400).json({ message: 'Course code is required.' });
    try {
        const courseResult = await executeCypherQuery(`MATCH (c:Course {courseCode: $courseCode}) RETURN c.courseId as courseId`, { courseCode: courseCode.toUpperCase() });
        if (courseResult.records.length === 0) return res.status(404).json({ message: 'Course not found with this code.' });
        const courseId = courseResult.records[0].get('courseId');
        await executeCypherQuery(`MERGE (user:User {id: $userId}) ON CREATE SET user.createdAt = datetime() WITH user MATCH (course:Course {courseId: $courseId}) MERGE (user)-[:ENROLLED_IN]->(course)`, { userId, courseId });
        res.status(200).json({ message: `Successfully enrolled in course ${courseCode}`});
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to enroll in course.' });
    }
});


// --- Lesson Routes ---
apiRouter.get('/courses/:courseId/lessons', isEnrolledOrOwner, async (req, res) => {
    const { courseId } = req.params;
    try {
        const result = await executeCypherQuery(`MATCH (:Course {courseId: $courseId})-[:HAS_LESSON]->(l:Lesson) RETURN l ORDER BY l.order ASC`, { courseId });
        res.json(result.records.map(record => record.get('l').properties));
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch lessons.' });
    }
});
apiRouter.post('/courses/:courseId/lessons', isCourseOwner, async (req, res) => {
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
        res.status(500).json({ message: 'Failed to create lesson.' });
    }
});

// Mount the main API router
app.use('/api', apiRouter);


// --- Server Startup ---
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
  });
}

export default app;
