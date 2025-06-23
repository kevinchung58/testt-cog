import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the root of cognee-backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
export const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
export const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
export const CHROMA_COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'cognee_main_collection';

// Default LLM model names
export const DEFAULT_CHAT_MODEL_NAME = process.env.DEFAULT_CHAT_MODEL_NAME || 'gemini-pro'; // Changed default to gemini-pro as gemini-2.0-flash might not exist
export const DEFAULT_EMBEDDING_MODEL_NAME = process.env.DEFAULT_EMBEDDING_MODEL_NAME || 'text-embedding-004';


if (!GEMINI_API_KEY && process.env.NODE_ENV !== 'test') {
  // In test environment, we might mock the Gemini API, so key might not be needed
  console.warn('Warning: GEMINI_API_KEY is not set. LLM functionalities will be disabled or mocked.');
}
