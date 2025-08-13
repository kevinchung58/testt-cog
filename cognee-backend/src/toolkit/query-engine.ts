import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RetrievalQAChain, ConversationalRetrievalQAChain } from 'langchain/chains';
import { GEMINI_API_KEY, DEFAULT_CHAT_MODEL_NAME } from '../config'; // Import new config for chat model name
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { BaseMessage } from '@langchain/core/messages';


let defaultLlm: ChatGoogleGenerativeAI | undefined;

function createLlmInstance(modelName?: string): ChatGoogleGenerativeAI | undefined {
  const effectiveModelName = modelName || DEFAULT_CHAT_MODEL_NAME;
  if (GEMINI_API_KEY) {
    try {
      const model = new ChatGoogleGenerativeAI({
        apiKey: GEMINI_API_KEY,
        model: effectiveModelName,
        temperature: 0.3, // Default, can be configured
      });
      console.log(`ChatGoogleGenerativeAI instance created with model ${effectiveModelName} for query-engine.ts`);
      return model;
    } catch (error) {
      console.error(`Failed to initialize ChatGoogleGenerativeAI with model ${effectiveModelName}:`, error);
      return undefined;
    }
  } else {
    console.warn('GEMINI_API_KEY is not set. Query engine will not be functional.');
    return undefined;
  }
}

function getLlm(modelName?: string): ChatGoogleGenerativeAI {
  // If a specific modelName is requested, try to create a new instance for it.
  if (modelName && modelName !== DEFAULT_CHAT_MODEL_NAME) {
    const specificLlm = createLlmInstance(modelName);
    if (specificLlm) {
      return specificLlm;
    }
    console.warn(`Failed to create specific LLM ${modelName}. Falling back to default.`);
  }

  // Lazy initialization for the default LLM
  if (!defaultLlm) {
    console.log("Initializing default LLM for the first time in getLlm...");
    defaultLlm = createLlmInstance(); // Uses default name
  }

  if (!defaultLlm) {
    throw new Error('Default LLM not initialized. GEMINI_API_KEY might be missing or default chat model name is invalid.');
  }

  return defaultLlm;
}

/**
 * Creates a RetrievalQAChain for question answering over a vector store.
 * @param retriever - The VectorStoreRetriever instance.
 * @returns A RetrievalQAChain instance.
 */
export function createRAGChain(retriever: VectorStoreRetriever, chatModelName?: string) {
  const currentLlm = getLlm(chatModelName);

  // Optional: Define a custom prompt template for the RAG chain
  const qaPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      "You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. " +
      "If you don't know the answer, just say that you don't know, don't try to make up an answer. " +
      `Keep the answer concise and relevant to the question.

Context:
{context}`
    ),
    HumanMessagePromptTemplate.fromTemplate(`Question: {question}
Answer:`),
  ]);

  console.log('Creating RAG chain...');
  const chain = RetrievalQAChain.fromLLM(
    currentLlm,
    retriever,
    {
      returnSourceDocuments: true, // As per user's TODO
      // prompt: qaPromptTemplate, // Optional: uncomment to use the custom prompt
      // verbose: true, // Optional: for debugging
    }
  );
  return chain;
}

/**
 * (Advanced) Creates a ConversationalRetrievalQAChain for question answering
 * with chat history over a vector store.
 * @param retriever - The VectorStoreRetriever instance.
 * @returns A ConversationalRetrievalQAChain instance.
 */
export function createConversationalChain(retriever: VectorStoreRetriever, chatModelName?: string) {
  const currentLlm = getLlm(chatModelName);

  // Prompt for condensing the question based on chat history
  const questionGeneratorTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      "Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language."
    ),
    new MessagesPlaceholder("chat_history"),
    HumanMessagePromptTemplate.fromTemplate(`Follow Up Input: {question}
Standalone question:`),
  ]);

  // Prompt for answering the question based on context
  const qaPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. Keep the answer concise and relevant to the question.

Context:
{context}`
    ),
    HumanMessagePromptTemplate.fromTemplate(`Question: {question}
Helpful Answer:`),
  ]);


  console.log('Creating Conversational RAG chain...');
  const chain = ConversationalRetrievalQAChain.fromLLM(
    currentLlm,
    retriever,
    {
      returnSourceDocuments: true, // As per user's TODO
      // questionGeneratorChainOptions: { // More explicit way to pass prompt for question generation
      //   template: questionGeneratorTemplate, // This might not be the correct way to pass template directly
      //   llm: currentLlm, // Can specify a different LLM for question generation if needed
      // },
      // verbose: true, // Optional for debugging
      // qaChainOptions: { // For passing custom prompt to the QA part
      //   prompt: qaPromptTemplate, // This also might need specific structuring
      //   type: "stuff", // Default combine documents chain type
      // }
      // For more control over prompts in ConversationalRetrievalQAChain,
      // you might need to construct the underlying chains (questionGenerator and combineDocsChain) manually.
      // The fromLLM static method provides a simpler setup with default prompts.
      // For custom prompts, the documentation should be consulted for the exact structure.
      // The user's example snippet was simple, so this default setup should be close.
      // If specific prompts are needed, they can be passed via chainTypeAndInputKey / qaChainOptions according to docs.
      // For now, relying on default prompts for qa and question generation or simple overrides if they work.
      // The most straightforward way to customize prompts is to pass them when creating the chain.
      // Let's try with a simplified way to include custom prompts if fromLLM supports it directly or via qaPrompt
      // The fromLLM constructor has limited prompt customization.
      // For full control, one would manually construct the underlying chains.
      // Removing these incorrect options to allow the chain to be created with defaults.
    }
  );
  return chain;
}

console.log('query-engine.ts loaded');
