import { generateCypherQuery, generateEmbeddings } from './llmService'; // generateEmbeddings added
import { executeQuery as executeNeo4jQuery, QueryResult } from './neo4jService';
import { searchSimilarChunks as searchChroma } from './vectorDbService'; // getOrCreateCollection not strictly needed here if searchChroma ensures it
import { CHROMA_COLLECTION_NAME } from '../config'; // Add this

interface FormattedGraphResult {
  // Define a structure for simpler result representation if needed
  // For now, we can return an array of records or a string summary
  records: any[];
  summary?: string; // Optional summary string
}

function formatNeo4jResults(neo4jResult: QueryResult): string[] {
  if (!neo4jResult || !neo4jResult.records || neo4jResult.records.length === 0) {
    return ['No results found in the graph.'];
  }
  // This is a basic formatter. It can be made more sophisticated.
  // It tries to convert records into readable strings.
  return neo4jResult.records.map(record => {
    let recordString = '';
    record.keys.forEach(key => {
      const value = record.get(key);
      let valueString = '';
      if (value && typeof value === 'object') {
        // Handle nodes or relationships or paths
        if (value.labels && value.properties) { // Likely a Node
          valueString = `Node(labels: ${value.labels.join(', ')}, properties: ${JSON.stringify(value.properties)})`;
        } else if (value.type && value.properties && value.start && value.end) { // Likely a Relationship
          valueString = `Relationship(type: ${value.type}, properties: ${JSON.stringify(value.properties)})`;
        } else {
          valueString = JSON.stringify(value); // Default object stringification
        }
      } else {
        valueString = String(value);
      }
      recordString += `${key}: ${valueString}; `;
    });
    return recordString.trim();
  }).slice(0, 10); // Limit to first 10 results for context brevity
}

export async function executeQueryAgainstGraph(naturalLanguageQuestion: string): Promise<string[]> {
  console.log(`Executing graph query for question: "${naturalLanguageQuestion}"`);
  // Define a simple schema description for the LLM. This can be expanded.
  const graphSchemaDescription =
    "Nodes are labeled ':Entity' and have a 'name' property. " +
    "Relationships are of type ':RELATIONSHIP' and have a 'type' property which stores the actual relation name (e.g., 'founded', 'launched'). " +
    "Example Cypher: MATCH (e1:Entity {name: 'SpaceX'})-[r:RELATIONSHIP {type: 'launched'}]->(e2:Entity {name: 'Falcon 9'}) RETURN e1, r, e2.";

  try {
    const cypherQuery = await generateCypherQuery(naturalLanguageQuestion, graphSchemaDescription);
    console.log(`Generated Cypher for graph query: ${cypherQuery}`);

    if (cypherQuery.includes('// Error:') || cypherQuery.includes('// Placeholder:')) {
      console.warn('Cannot execute placeholder or error Cypher query against graph.');
      return [`Could not translate question to a graph query effectively. Query generated: ${cypherQuery}`];
    }

    const neo4jResult = await executeNeo4jQuery(cypherQuery);
    console.log(`Successfully executed Cypher query. Records count: ${neo4jResult.records.length}`);

    return formatNeo4jResults(neo4jResult);

  } catch (error: any) {
    console.error('Error during graph query execution pipeline:', error.message);
    // Check if it's a Neo4jError and provide specific feedback
    if (error.code && error.code.startsWith('Neo.')) { // Neo4jError often has a code like Neo.ClientError.Statement.SyntaxError
        return [`Error executing graph query: ${error.message}. Potentially invalid Cypher generated by LLM.`];
    }
    return [`An error occurred while querying the knowledge graph: ${error.message}`];
  }
}

export async function fetchGraphSchemaSummary(): Promise<{ nodeLabels: string[], relationshipTypes: string[] }> {
  console.log('Fetching graph schema summary (labels and relationship types)...');
  try {
    const labelsResult = await executeNeo4jQuery('CALL db.labels() YIELD label RETURN collect(label) AS nodeLabels');
    const nodeLabels: string[] = (labelsResult.records.length > 0 && labelsResult.records[0].get('nodeLabels')) ? labelsResult.records[0].get('nodeLabels') : [];

    const typesResult = await executeNeo4jQuery('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS relationshipTypes');
    const relationshipTypes: string[] = (typesResult.records.length > 0 && typesResult.records[0].get('relationshipTypes')) ? typesResult.records[0].get('relationshipTypes') : [];

    console.log(`Found labels: ${nodeLabels.join(', ')} and types: ${relationshipTypes.join(', ')}`);
    return { nodeLabels, relationshipTypes };

  } catch (error: any) {
    console.error('Error fetching graph schema summary:', error.message);
    throw new Error(`Failed to fetch graph schema summary: ${error.message}`);
  }
}

export async function fetchNodeNeighbors(nodeId: string): Promise<{ nodes: any[]; links: any[] }> {
  // IMPORTANT: The Cypher query uses `WHERE elementId(startNode) = $nodeId`
  // This assumes $nodeId is the actual internal element ID string.
  // If nodeId is a property value (e.g., name or a custom id), the query should be:
  // MATCH (startNode {idProperty: $nodeId})-[r]-(neighborNode) ... (or similar)
  const cypherQuery = `
    MATCH (startNode)-[r]-(neighborNode)
    WHERE elementId(startNode) = $nodeId
    RETURN startNode, r, neighborNode
    LIMIT 15
  `;
  const params = { nodeId };
  console.log(`Executing Cypher for node neighbors: ${cypherQuery} with params: ${JSON.stringify(params)}`);

  try {
    const neo4jResult = await executeNeo4jQuery(cypherQuery, params);

    const nodesMap = new Map<string, any>();
    const links: any[] = [];

    if (neo4jResult && neo4jResult.records) {
      neo4jResult.records.forEach(record => {
        const startNode = record.get('startNode');
        const r = record.get('r');
        const neighborNode = record.get('neighborNode');

        if (startNode && startNode.elementId) {
          if (!nodesMap.has(startNode.elementId)) {
            nodesMap.set(startNode.elementId, {
              id: startNode.elementId,
              name: startNode.properties.name || startNode.properties.title || startNode.elementId.substring(0,8),
              labels: startNode.labels,
              properties: startNode.properties,
            });
          }
        }
        if (neighborNode && neighborNode.elementId) {
          if (!nodesMap.has(neighborNode.elementId)) {
            nodesMap.set(neighborNode.elementId, {
              id: neighborNode.elementId,
              name: neighborNode.properties.name || neighborNode.properties.title || neighborNode.elementId.substring(0,8),
              labels: neighborNode.labels,
              properties: neighborNode.properties,
            });
          }
        }
        if (r && r.elementId && r.startNodeElementId && r.endNodeElementId) {
          // Check if link already exists by its own elementId
          if (!links.some(l => l.id === r.elementId)) {
            links.push({
              id: r.elementId,
              source: r.startNodeElementId,
              target: r.endNodeElementId,
              type: r.properties.type || r.type,
              properties: r.properties
            });
          }
        }
      });
    }

    console.log(`Transformed neighbor data: ${nodesMap.size} nodes, ${links.length} links.`);
    return { nodes: Array.from(nodesMap.values()), links };

  } catch (error: any) {
    console.error(`Error fetching neighbors for nodeId ${nodeId}:`, error.message);
    throw new Error(`Failed to fetch neighbors for nodeId ${nodeId}: ${error.message}`);
  }
}

export async function fetchGraphData(searchTerm?: string): Promise<{ nodes: any[]; links: any[] }> {
  let cypherQuery: string;
  const params: { searchTerm?: string } = {};

  if (searchTerm) {
    cypherQuery = `
      MATCH (n)-[r]-(m)
      WHERE (n.name CONTAINS $searchTerm OR n.id CONTAINS $searchTerm OR n.title CONTAINS $searchTerm)
         OR (m.name CONTAINS $searchTerm OR m.id CONTAINS $searchTerm OR m.title CONTAINS $searchTerm)
      RETURN n, r, m
      LIMIT 50`; // Ensure 'name', 'id', 'title' are common properties or adjust
    params.searchTerm = searchTerm;
  } else {
    cypherQuery = `
      MATCH (n)-[r]-(m)
      RETURN n, r, m
      LIMIT 25`;
  }
  console.log(`Executing Cypher for graph visualization: ${cypherQuery} with params: ${JSON.stringify(params)}`);

  try {
    const neo4jResult = await executeNeo4jQuery(cypherQuery, params);

    const nodesMap = new Map<string, any>();
    const links: any[] = [];

    if (neo4jResult && neo4jResult.records) {
      neo4jResult.records.forEach(record => {
        const n = record.get('n');
        const r = record.get('r');
        const m = record.get('m');

        if (n && n.elementId) { // Neo4j driver uses elementId for internal ID
          if (!nodesMap.has(n.elementId)) {
            nodesMap.set(n.elementId, {
              id: n.elementId,
              name: n.properties.name || n.properties.title || n.elementId.substring(0,8), // Fallback for display name
              labels: n.labels,
              properties: n.properties,
            });
          }
        }
        if (m && m.elementId) {
          if (!nodesMap.has(m.elementId)) {
            nodesMap.set(m.elementId, {
              id: m.elementId,
              name: m.properties.name || m.properties.title || m.elementId.substring(0,8), // Fallback for display name
              labels: m.labels,
              properties: m.properties,
            });
          }
        }
        if (r && r.elementId && n && m && n.elementId && m.elementId) {
          // Check if link already exists to avoid duplicates if relationship direction isn't fixed by query
          const linkExists = links.some(l =>
            (l.source === n.elementId && l.target === m.elementId && l.type === (r.properties.type || r.type)) ||
            (l.source === m.elementId && l.target === n.elementId && l.type === (r.properties.type || r.type)) // For undirected view
          );
          if (!linkExists) { // Or use r.elementId if it's unique per pair and direction for this query
            links.push({
              id: r.elementId,
              source: n.elementId,
              target: m.elementId,
              type: r.properties.type || r.type,
              properties: r.properties // Add this line to include all relationship properties
            });
          }
        }
      });
    }

    console.log(`Transformed graph data: ${nodesMap.size} nodes, ${links.length} links.`);
    return { nodes: Array.from(nodesMap.values()), links };

  } catch (error: any) {
    console.error('Error fetching graph data from Neo4j:', error.message);
    throw new Error(`Failed to fetch graph data: ${error.message}`);
  }
}

export async function searchVectorStore(
  naturalLanguageQuestion: string,
  collectionName: string = CHROMA_COLLECTION_NAME,
  topK: number = 3
): Promise<string[]> {
  console.log(`Executing vector store search for question: "${naturalLanguageQuestion}" in collection '${collectionName}'`);

  try {
    const questionEmbeddingResult = await generateEmbeddings([naturalLanguageQuestion]);
    if (!questionEmbeddingResult || questionEmbeddingResult.length === 0 || !questionEmbeddingResult[0] || questionEmbeddingResult[0].every(v => v === 0)) {
      console.warn('Failed to generate valid embedding for the question. Vector search might be ineffective or use mock data.');
      if (questionEmbeddingResult[0]?.every(v => v === 0)) {
         return ['Could not generate a valid question embedding for vector search (possibly missing API key for embeddings).'];
      }
      // If embeddings are just empty for some other reason, proceed but expect possibly no results.
    }

    // queryEmbeddings expects number[][]
    const questionEmbedding: number[][] = questionEmbeddingResult[0] ? [questionEmbeddingResult[0]] : [];

    if (questionEmbedding.length === 0) {
        // This case might already be covered by the check above, but as a safeguard:
        return ['Failed to generate embedding for vector search.'];
    }

    const similarChunksResults = await searchChroma(collectionName, questionEmbedding, topK);
    // searchChroma for a single query embedding ([questionEmbedding]) returns string[][] where outer array has 1 element
    console.log(`Found ${similarChunksResults.length > 0 ? similarChunksResults[0].length : 0} similar chunks from vector store for the question.`);

    const formattedChunks: string[] = (similarChunksResults && similarChunksResults.length > 0) ? similarChunksResults[0] : [];

    return formattedChunks;

  } catch (error: any) {
    console.error('Error during vector store search pipeline:', error.message);
    return [`An error occurred while searching the vector store: ${error.message}`];
  }
}
