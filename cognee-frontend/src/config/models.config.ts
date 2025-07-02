// src/config/models.config.ts

/**
 * Defines a list of available chat models for user selection in the frontend.
 * These are example model names. Actual available models may vary based on API key permissions
 * and backend support.
 *
 * For now, this list is hardcoded. In a more advanced setup, this could be fetched
 * from a backend API endpoint that lists compatible and available models.
 */
export const AVAILABLE_CHAT_MODELS: string[] = [
  'gemini-pro', // Default used in backend config if nothing else specified
  'gemini-1.0-pro', // Common general model
  // 'gemini-1.5-pro-latest', // Often a good choice for latest features
  'gemini-1.5-flash-latest', // Faster, potentially more cost-effective
  // Add other models as they become relevant or supported by the backend logic.
  // E.g., if specific versions are needed: 'gemini-1.0-pro-001'
];

/**
 * You could also define a default model to be pre-selected in the UI here,
 * or derive it from the AVAILABLE_CHAT_MODELS array (e.g., the first one).
 */
export const DEFAULT_SELECTED_CHAT_MODEL = AVAILABLE_CHAT_MODELS[0];
