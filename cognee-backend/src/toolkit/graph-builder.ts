import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';
import { Document } from '@langchain/core/documents';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  NEO4J_URI,
  NEO4J_USER as NEO4J_USERNAME,
  NEO4J_PASSWORD,
  GEMINI_API_KEY,
  DEFAULT_CHAT_MODEL_NAME
} from '../config';
import {
  ChatPromptTemplate,
} from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { v4 as uuidv4 } from 'uuid';

let driver: Driver | undefined;

// Initialize Neo4j Driver
function getDriverInstance(): Driver {
  if (!driver) {
    if (NEO4J_URI && NEO4J_USERNAME && NEO4J_PASSWORD) {
      try {
        driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
        console.log('Neo4j driver initialized for graph-builder.');
      } catch (error) {
        console.error('Failed to create Neo4j driver in graph-builder:', error);
        throw new Error('Could not create Neo4j driver instance.');
      }
    } else {
      console.warn('Neo4j connection details are not fully set. Graph operations will be unavailable.');
      throw new Error('Neo4j driver not initialized. Check connection details in config.');
    }
  }
  return driver;
}


// Initialize LLM for graph operations - simplified to always create a new instance
function getLlmInstance(modelName?: string): ChatGoogleGenerativeAI {
  const effectiveModelName = modelName || DEFAULT_CHAT_MODEL_NAME;
  if (GEMINI_API_KEY) {
    try {
      const model = new ChatGoogleGenerativeAI({
        apiKey: GEMINI_API_KEY,
        model: effectiveModelName,
        temperature: 0.2,
      });
      console.log(`ChatGoogleGenerativeAI instance created with model ${effectiveModelName} for graph-builder.ts`);
      return model;
    } catch (error) {
      console.error(`Failed to initialize ChatGoogleGenerativeAI for graph-builder with model ${effectiveModelName}:`, error);
      throw new Error('Failed to create LLM instance.');
    }
  } else {
    console.warn('GEMINI_API_KEY is not set in graph-builder. LLM-dependent graph operations will be unavailable.');
    throw new Error('GEMINI_API_KEY is not set.');
  }
}

export async function executeCypherQuery(query: string, params?: Record<string, any>): Promise<QueryResult> {
  const currentDriver = getDriverInstance();
  let session: Session | undefined;
  try {
    session = currentDriver.session();
    console.log(`Executing Cypher: ${query} with params: ${JSON.stringify(params)}`);
    const result = await session.run(query, params);
    return result;
  } catch (error: any) {
    console.error(`Error executing Cypher query in graph-builder: ${query}`, error.message, error.stack);
    throw new Error(`Failed to execute Cypher query: ${error.message}`);
  } finally {
    if (session) {
      await session.close();
    }
  }
}

// Interface for structured graph data from LLM
export interface GraphElements {
  nodes: Array<{ id: string; type: string; properties: Record<string, any> }>;
  relationships: Array<{ sourceId: string; targetId: string; type: string; properties?: Record<string, any> }>;
}

// Frontend-compatible GraphData structure
export interface FeGraphNode {
  id: string;
  name: string;
  labels?: string[];
  properties?: Record<string, any>;
  color?: string;
  val?: number;
}

export interface FeGraphLink {
  source: string;
  target: string;
  type?: string;
  properties?: Record<string, any>;
}

export interface FeGraphData {
  nodes: FeGraphNode[];
  links: FeGraphLink[];
}

function recordsToFeGraphData(records: any[]): FeGraphData {
  const nodes = new Map<string, FeGraphNode>();
  const links: FeGraphLink[] = [];

  records.forEach(record => {
    record.keys.forEach((key: string) => {
      const element = record.get(key);
      if (element && typeof element === 'object') {
        if (element.labels && element.identity) { // Likely a Neo4j Node
          const nodeId = element.properties.id || element.identity.toString();
          if (!nodes.has(nodeId)) {
            nodes.set(nodeId, {
              id: nodeId,
              name: element.properties.name || element.properties.title || nodeId,
              labels: element.labels,
              properties: element.properties,
            });
          }
        } else if (element.type && element.start && element.end && element.identity) { // Likely a Neo4j Relationship
          const sourceId = element.properties.sourceId || element.start.toString();
          const targetId = element.properties.targetId || element.end.toString();
          links.push({
            source: sourceId,
            target: targetId,
            type: element.type,
            properties: element.properties,
          });
        }
      }
    });
  });
  return { nodes: Array.from(nodes.values()), links };
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
}

export async function saveChatMessage(sessionId: string, message: ChatMessage): Promise<void> {
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  try {
    await session.writeTransaction(async tx => {
        await tx.run(
            `MERGE (s:ChatSession {sessionId: $sessionId}) ON CREATE SET s.createdAt = datetime()`,
            { sessionId }
        );
        const messageResult = await tx.run(
            `CREATE (msg:ChatMessage {
                messageId: $messageId,
                type: $type,
                text: $text,
                timestamp: datetime()
            }) RETURN id(msg) AS neo4jId`,
            { messageId: message.id, type: message.type, text: message.text }
        );
        const newMessageNeo4jId = messageResult.records[0].get('neo4jId');
        await tx.run(
            `MATCH (s:ChatSession {sessionId: $sessionId})
             MATCH (msg:ChatMessage) WHERE id(msg) = $newMessageNeo4jId
             CREATE (s)-[:HAS_MESSAGE]->(msg)`,
            { sessionId, newMessageNeo4jId }
        );
        const lastMessageResult = await tx.run(
            `MATCH (s:ChatSession {sessionId: $sessionId})-[:HAS_MESSAGE]->(m:ChatMessage)
             WHERE id(m) <> $newMessageNeo4jId AND NOT (m)-[:NEXT_MESSAGE]->(:ChatMessage)
             RETURN id(m) AS lastMessageNeo4jId LIMIT 1`,
            { sessionId, newMessageNeo4jId }
        );
        if (lastMessageResult.records.length > 0) {
            const lastMessageNeo4jId = lastMessageResult.records[0].get('lastMessageNeo4jId');
            await tx.run(
                `MATCH (prev:ChatMessage), (next:ChatMessage)
                 WHERE id(prev) = $lastMessageNeo4jId AND id(next) = $newMessageNeo4jId
                 CREATE (prev)-[:NEXT_MESSAGE]->(next)`,
                { lastMessageNeo4jId, newMessageNeo4jId }
            );
        }
    });
    console.log(`Message ${message.id} saved for session ${sessionId}.`);
  } catch (error: any) {
    console.error(`Error saving chat message for session ${sessionId}:`, error.message, error.stack);
    throw new Error(`Failed to save chat message: ${error.message}`);
  } finally {
    await session.close();
  }
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  try {
    const result = await session.readTransaction(async tx =>
      tx.run(
        `MATCH (s:ChatSession {sessionId: $sessionId})-[:HAS_MESSAGE]->(msg:ChatMessage)
         RETURN msg.messageId AS id, msg.type AS type, msg.text AS text
         ORDER BY msg.timestamp ASC`,
        { sessionId }
      )
    );
    return result.records.map(record => ({
      id: record.get('id'),
      type: record.get('type') as 'user' | 'ai',
      text: record.get('text'),
    }));
  } catch (error: any) {
    console.error(`Error retrieving chat history for session ${sessionId}:`, error.message, error.stack);
    throw new Error(`Failed to retrieve chat history: ${error.message}`);
  } finally {
    await session.close();
  }
}

export async function deleteChatHistory(sessionId: string): Promise<void> {
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  try {
    await session.writeTransaction(async tx => {
      await tx.run(
        `MATCH (s:ChatSession {sessionId: $sessionId})-[hr:HAS_MESSAGE]->(msg:ChatMessage)
         DETACH DELETE msg`,
        { sessionId }
      );
      await tx.run(
        `MATCH (s:ChatSession {sessionId: $sessionId}) DETACH DELETE s`,
        { sessionId }
      );
    });
    console.log(`Chat history for session ${sessionId} deleted successfully.`);
  } catch (error: any) {
    console.error(`Error deleting chat history for session ${sessionId}:`, error.message, error.stack);
    throw new Error(`Failed to delete chat history: ${error.message}`);
  } finally {
    await session.close();
  }
}

export interface SavedPrompt {
  promptId: string;
  name: string;
  text: string;
  createdAt: string;
}

export async function saveUserPrompt(name: string, text: string): Promise<SavedPrompt> {
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  const promptId = uuidv4();
  const createdAt = new Date().toISOString();
  try {
    const result = await session.writeTransaction(async tx =>
      tx.run(
        `CREATE (p:SavedPrompt {
           promptId: $promptId,
           name: $name,
           text: $text,
           createdAt: datetime($createdAt)
         }) RETURN p.promptId AS promptId, p.name AS name, p.text AS text, p.createdAt AS createdAt`,
        { promptId, name, text, createdAt }
      )
    );
    const record = result.records[0];
    return {
      promptId: record.get('promptId'),
      name: record.get('name'),
      text: record.get('text'),
      createdAt: record.get('createdAt').toString(),
    };
  } catch (error: any) {
    console.error(`Error saving user prompt "${name}":`, error.message, error.stack);
    throw new Error(`Failed to save user prompt: ${error.message}`);
  } finally {
    await session.close();
  }
}

export async function getSavedPrompts(): Promise<SavedPrompt[]> {
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  try {
    const result = await session.readTransaction(async tx =>
      tx.run(
        `MATCH (p:SavedPrompt)
         RETURN p.promptId AS promptId, p.name AS name, p.text AS text, p.createdAt AS createdAt
         ORDER BY p.createdAt DESC`
      )
    );
    return result.records.map(record => ({
      promptId: record.get('promptId'),
      name: record.get('name'),
      text: record.get('text'),
      createdAt: record.get('createdAt').toString(),
    }));
  } catch (error: any) {
    console.error('Error retrieving saved prompts:', error.message, error.stack);
    throw new Error(`Failed to retrieve saved prompts: ${error.message}`);
  } finally {
    await session.close();
  }
}

export async function deleteSavedPrompt(promptId: string): Promise<void> {
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  try {
    await session.writeTransaction(async tx =>
      tx.run(
        `MATCH (p:SavedPrompt {promptId: $promptId}) DETACH DELETE p`,
        { promptId }
      )
    );
    console.log(`Prompt ${promptId} deleted successfully.`);
  } catch (error: any) {
    console.error(`Error deleting prompt ${promptId}:`, error.message, error.stack);
    throw new Error(`Failed to delete prompt: ${error.message}`);
  } finally {
    await session.close();
  }
}

export async function getGraphOverview(searchTerm?: string, limit: number = 50): Promise<FeGraphData> {
  let query: string;
  const params: Record<string, any> = { limit };
  if (searchTerm) {
    query = `
      MATCH path = (n)-[r]-(m)
      WHERE (n.name CONTAINS $searchTerm OR n.id CONTAINS $searchTerm OR n.nodeType CONTAINS $searchTerm)
      RETURN n, r, m
      LIMIT $limit
    `;
    params.searchTerm = searchTerm;
  } else {
    query = `
      MATCH (n)
      OPTIONAL MATCH (n)-[r]-(m)
      RETURN n, r, m
      LIMIT $limit
    `;
  }
  console.log(`Executing getGraphOverview. Search: "${searchTerm}", Cypher: ${query}`);
  const result = await executeCypherQuery(query, params);
  return recordsToFeGraphData(result.records);
}

export async function getNodeWithNeighbors(nodeId: string): Promise<FeGraphData> {
  const query = `
    MATCH (n {id: $nodeId})-[r]-(m)
    RETURN n, r, m
    UNION
    MATCH (n {id: $nodeId})
    RETURN n, null as r, null as m
  `;
  const params = { nodeId };
  console.log(`Executing getNodeWithNeighbors for nodeId: "${nodeId}", Cypher: ${query}`);
  const result = await executeCypherQuery(query, params);
  return recordsToFeGraphData(result.records);
}

const EXTRACT_GRAPH_PROMPT_TEMPLATE =
  `From the text below, extract entities and their relationships to form a knowledge graph.
Return the result as a single valid JSON object with two keys: "nodes" and "relationships".
The "nodes" key should have a value of an array of objects, where each object has "id" (a unique identifier derived from the entity name or concept), "type" (a general category for the entity, e.g., "Person", "Organization", "Concept"), and "properties" (an object of key-value pairs, including at least a "name" property).
The "relationships" key should have a value of an array of objects, where each object has "sourceId" (the id of the source node), "targetId" (the id of the target node), "type" (the name of the relationship, e.g., "FOUNDED_BY", "WORKS_AT", "RELATED_TO"), and optionally "properties" (an object for relationship attributes).
Focus on the most important entities and relationships. Ensure IDs are consistent. If no meaningful graph can be extracted, return an object with empty arrays for nodes and relationships.

Example Text: 'Apple Inc. was co-founded by Steve Jobs, Steve Wozniak, and Ronald Wayne. Tim Cook is the current CEO of Apple.'
Example JSON Output:
{
  "nodes": [
    {"id": "apple_inc", "type": "Organization", "properties": {"name": "Apple Inc."}},
    {"id": "steve_jobs", "type": "Person", "properties": {"name": "Steve Jobs"}},
    {"id": "steve_wozniak", "type": "Person", "properties": {"name": "Steve Wozniak"}},
    {"id": "ronald_wayne", "type": "Person", "properties": {"name": "Ronald Wayne"}},
    {"id": "tim_cook", "type": "Person", "properties": {"name": "Tim Cook"}}
  ],
  "relationships": [
    {"sourceId": "apple_inc", "targetId": "steve_jobs", "type": "CO_FOUNDED_BY"},
    {"sourceId": "apple_inc", "targetId": "steve_wozniak", "type": "CO_FOUNDED_BY"},
    {"sourceId": "apple_inc", "targetId": "ronald_wayne", "type": "CO_FOUNDED_BY"},
    {"sourceId": "tim_cook", "targetId": "apple_inc", "type": "CEO_OF"}
  ]
}

Text to process:
'{document_content}'

JSON Output:`;

export async function extractGraphElementsFromDocument(document: Document, chatModelName?: string): Promise<GraphElements> {
  const currentLlm = getLlmInstance(chatModelName);
  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage("You are an expert in knowledge graph extraction. Your output must be a single valid JSON object with 'nodes' and 'relationships' keys, as per the user's instructions. Do not include any other text or markdown formatting."),
    new HumanMessage(EXTRACT_GRAPH_PROMPT_TEMPLATE),
  ]);
  const parser = new StringOutputParser();

  try {
    console.log(`Extracting graph elements from document (source: ${document.metadata?.source || 'unknown'}). Snippet: ${document.pageContent.substring(0,100)}...`);

    // Refactored from .pipe() to sequential calls
    const formattedPrompt = await prompt.invoke({ document_content: document.pageContent });
    const llmResult = await currentLlm.invoke(formattedPrompt);
    const llmResponse = await parser.invoke(llmResult);

    let jsonString = llmResponse.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7);
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.substring(0, jsonString.length - 3);
      }
      jsonString = jsonString.trim();
    }
     if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
        console.error('LLM response for graph elements was not a JSON object string after trimming potential markdown:', jsonString);
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonString = jsonString.substring(startIndex, endIndex + 1);
        } else {
            console.error('Could not reliably extract JSON object from response.');
            return { nodes: [], relationships: [] };
        }
    }
    const graphElements = JSON.parse(jsonString) as GraphElements;
    if (!graphElements || !Array.isArray(graphElements.nodes) || !Array.isArray(graphElements.relationships)) {
      console.warn('LLM output for graph extraction was not in the expected format. Returning empty graph.');
      return { nodes: [], relationships: [] };
    }
    console.log(`Extracted ${graphElements.nodes.length} nodes and ${graphElements.relationships.length} relationships.`);
    return graphElements;
  } catch (error: any) {
    console.error(`Error extracting graph elements from document: ${error.message}`, error.stack);
    return { nodes: [], relationships: [] };
  }
}

export async function addGraphElementsToNeo4j(graphElements: GraphElements): Promise<void> {
  if (graphElements.nodes.length === 0 && graphElements.relationships.length === 0) {
    console.log("No graph elements to add to Neo4j.");
    return;
  }
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  try {
    console.log(`Adding ${graphElements.nodes.length} nodes and ${graphElements.relationships.length} relationships to Neo4j.`);
    await session.writeTransaction(async tx => {
      for (const node of graphElements.nodes) {
        const properties = node.properties || {};
        await tx.run(
          `MERGE (n:Resource {id: $id}) SET n += $properties, n.nodeType = $nodeType`,
          { id: node.id, properties: properties, nodeType: node.type }
        );
      }
      for (const rel of graphElements.relationships) {
        const properties = rel.properties || {};
        const sanitizedRelType = rel.type.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
        if (!sanitizedRelType) {
            console.warn(`Skipping relationship due to empty sanitized type from original: ${rel.type}`);
            continue;
        }
        await tx.run(
          `MATCH (source:Resource {id: $sourceId})
            MATCH (target:Resource {id: $targetId})
            MERGE (source)-[r:\`${sanitizedRelType}\`]->(target)
            SET r += $properties`,
          { sourceId: rel.sourceId, targetId: rel.targetId, properties: properties }
        );
      }
    });
    console.log("Successfully added graph elements to Neo4j.");
  } catch (error: any) {
    console.error('Error adding graph elements to Neo4j:', error.message, error.stack);
    throw new Error(`Failed to add graph elements to Neo4j: ${error.message}`);
  } finally {
    await session.close();
  }
}

export async function documentsToGraph(documents: Document[]): Promise<void> {
    console.log(`Starting graph extraction from ${documents.length} documents.`);
    for (const doc of documents) {
        try {
            console.log(`Processing document with source: ${doc.metadata?.source}`);
            const graphElements = await extractGraphElementsFromDocument(doc);
            if (graphElements.nodes.length > 0 || graphElements.relationships.length > 0) {
                await addGraphElementsToNeo4j(graphElements);
            } else {
                console.log(`No graph elements extracted from document: ${doc.metadata?.source}`);
            }
        } catch (error) {
            console.error(`Failed to process document to graph (source: ${doc.metadata?.source || 'unknown'}): `, error);
        }
    }
    console.log("Finished processing all documents for graph extraction.");
}

const GENERATE_CYPHER_FOR_QA_PROMPT =
  `Given the graph schema (node labels, relationship types, properties) and a question,
generate a Cypher query to answer the question.
Only return the Cypher query, with no explanations, comments, or markdown.
Schema:
{schema}

Question: {question}
Cypher Query:`;

export async function queryGraph(naturalLanguageQuestion: string, graphSchemaSummary?: string, chatModelName?: string): Promise<any[]> {
  const currentLlm = getLlmInstance(chatModelName);
  let schemaForPrompt = graphSchemaSummary;
  if (!schemaForPrompt) {
    try {
        const { nodeLabels, relationshipTypes } = await fetchGraphSchemaSummary();
        schemaForPrompt = `Node Labels: ${nodeLabels.join(', ')}. Relationship Types: ${relationshipTypes.join(', ')}.`;
    } catch (error) {
        console.warn("Could not fetch graph schema for queryGraph, using default.", error);
        schemaForPrompt = "Nodes have 'name' and 'id' properties. Relationships have 'type'.";
    }
  }
  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage("You are an expert Cypher query generator for question answering. Only return the Cypher query. No explanations, comments, or markdown."),
    new HumanMessage(GENERATE_CYPHER_FOR_QA_PROMPT),
  ]);
  const parser = new StringOutputParser();
  try {
    // Refactored from .pipe() to sequential calls
    const formattedPrompt = await prompt.invoke({ schema: schemaForPrompt, question: naturalLanguageQuestion });
    const llmResult = await currentLlm.invoke(formattedPrompt);
    const cypherQuery = await parser.invoke(llmResult);

    console.log(`Generated Cypher for graph query: ${cypherQuery}`);
    if (!cypherQuery || cypherQuery.toLowerCase().includes("i cannot answer")) {
        console.warn("LLM could not generate a valid Cypher query for the question.");
        return [{ warning: "Could not translate question to a graph query.", query: cypherQuery }];
    }
    const result = await executeCypherQuery(cypherQuery.trim());
    return result.records.map(record => record.toObject());
  } catch (error: any) {
    console.error(`Error in queryGraph for question "${naturalLanguageQuestion}":`, error.message, error.stack);
    throw error;
  }
}

export async function fetchGraphSchemaSummary(): Promise<{ nodeLabels: string[], relationshipTypes: string[], propertyKeys: string[] }> {
  console.log('Fetching graph schema summary (labels, rel types, properties)...');
  const currentDriver = getDriverInstance();
  const session = currentDriver.session();
  try {
    const labelsResult = await session.run('CALL db.labels() YIELD label RETURN collect(label) AS nodeLabels');
    const nodeLabels: string[] = (labelsResult.records.length > 0 && labelsResult.records[0].get('nodeLabels')) ? labelsResult.records[0].get('nodeLabels') : [];
    const typesResult = await session.run('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS relationshipTypes');
    const relationshipTypes: string[] = (typesResult.records.length > 0 && typesResult.records[0].get('relationshipTypes')) ? typesResult.records[0].get('relationshipTypes') : [];
    const propertiesResult = await session.run('CALL db.propertyKeys() YIELD propertyKey RETURN collect(propertyKey) AS propertyKeys');
    const propertyKeys: string[] = (propertiesResult.records.length > 0 && propertiesResult.records[0].get('propertyKeys')) ? propertiesResult.records[0].get('propertyKeys') : [];
    console.log(`Found labels: ${nodeLabels.join(', ')}, types: ${relationshipTypes.join(', ')}, properties: ${propertyKeys.join(', ')}`);
    return { nodeLabels, relationshipTypes, propertyKeys };
  } catch (error: any) {
    console.error('Error fetching graph schema summary:', error.message, error.stack);
    throw new Error(`Failed to fetch graph schema summary: ${error.message}`);
  } finally {
    await session.close();
  }
}

console.log('graph-builder.ts loaded');
