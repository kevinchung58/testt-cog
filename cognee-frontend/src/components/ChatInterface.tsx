import React, { useState, FormEvent, ChangeEvent, useEffect, useCallback } from 'react';
import {
  askQuery,
  fetchChatHistory,
  ApiChatMessage,
  apiGetSavedPrompts,
  apiSaveUserPrompt,
  apiDeleteSavedPrompt,
  SavedPrompt as ApiSavedPrompt, // Use the interface from apiService
  apiDeleteChatHistory // Import the new service function
} from '../services/apiService';
import { AVAILABLE_CHAT_MODELS, DEFAULT_SELECTED_CHAT_MODEL } from '../../config/models.config'; // Import model config
import styles from './ChatInterface.module.css';
import { v4 as uuidv4 } from 'uuid'; // For generating client-side session ID

// const LOCAL_STORAGE_KEY = 'cogneeChatHistory'; // No longer used for history itself
const SESSION_ID_STORAGE_KEY = 'cogneeChatSessionId';
// const SAVED_PROMPTS_STORAGE_KEY = 'cogneeSavedPrompts'; // No longer used

interface ChatMessage { // This is the component's internal ChatMessage type
  id: string;
  type: 'user' | 'ai';
  text: string;
}

// Using ApiSavedPrompt directly as the state type for savedPrompts
// interface SavedPrompt {
//   id: string; // This will be promptId from backend
//   name: string;
//   text: string;
// }

const ChatInterface: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<ApiSavedPrompt[]>([]); // Use ApiSavedPrompt
  const [showPromptManager, setShowPromptManager] = useState<boolean>(false);
  const [newPromptName, setNewPromptName] = useState<string>('');
  const [promptToSave, setPromptToSave] = useState<string>('');
  const [selectedChatModel, setSelectedChatModel] = useState<string>(DEFAULT_SELECTED_CHAT_MODEL);


  // Load sessionId, chat history, and saved prompts on mount
  useEffect(() => {
    // Session ID
    let storedSessionId = localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem(SESSION_ID_STORAGE_KEY, storedSessionId);
    }
    setSessionId(storedSessionId);

    const loadHistory = async () => {
      if (storedSessionId) {
        setIsLoading(true); // Indicate loading history
        try {
          const history = await fetchChatHistory(storedSessionId);
          // Ensure IDs are unique if backend and frontend might generate similar ones (e.g. Date.now())
          // For now, assuming backend IDs are sufficiently unique or we'll use them directly.
          // The ApiChatMessage might have different ID structure than internal ChatMessage if needed.
          setChatHistory(history.map(h => ({id: h.id, type: h.type, text: h.text })));
        } catch (e) {
          console.error("Failed to fetch chat history:", e);
          setError("Could not load previous chat history.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadHistory();

    // Load Saved Prompts from backend
    const loadSavedPrompts = async () => {
      try {
        const prompts = await apiGetSavedPrompts();
        setSavedPrompts(prompts);
      } catch (e) {
        console.error("Error loading saved prompts from API:", e);
        // Optionally set an error state for prompt loading
      }
    };
    loadSavedPrompts();
  }, []);

  // No longer need useEffect to save prompts to local storage, backend handles persistence.


  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCurrentQuestion(event.target.value);
  };

  // Wrapped setChatHistory to ensure atomicity for adding user and initial AI message
  const appendToHistory = useCallback((newMessage: ChatMessage | ChatMessage[]) => {
    setChatHistory(prevHistory => Array.isArray(newMessage) ? [...prevHistory, ...newMessage] : [...prevHistory, newMessage]);
  }, []);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentQuestion.trim()) {
      setError('Please enter a question.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: currentQuestion.trim(),
    };

    const aiMessageId = `ai-${Date.now()}`;
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      type: 'ai',
      text: '', // Start with empty text, tokens will append here
    };

    // Add both user message and initial AI message placeholder together
    appendToHistory([userMessage, initialAiMessage]);

    setIsLoading(true);
    setError('');
    setCurrentQuestion(''); // Clear input field

    const handleNewSessionId = (newSessionId: string) => {
      setSessionId(newSessionId);
      localStorage.setItem(SESSION_ID_STORAGE_KEY, newSessionId);
      console.log('Session ID updated by backend:', newSessionId);
    };

    const onToken = (token: string) => {
      setChatHistory(prevHistory =>
        prevHistory.map(msg =>
          msg.id === aiMessageId ? { ...msg, text: msg.text + token } : msg
        )
      );
    };

    const onComplete = () => {
      console.log('Streaming complete.');
      setIsLoading(false);
      // User and AI messages are saved by backend during /query call.
      // No explicit save needed here. Frontend history is for display.
    };

    const onError = (error: Error) => {
      console.error('Streaming error:', error);
      setChatHistory(prevHistory =>
        prevHistory.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, text: msg.text + `\n\nError: ${error.message || 'Failed to get full response.'}` }
            : msg
        )
      );
      setError(error.message || 'Failed to get an answer stream.');
      setIsLoading(false);
    };

    // Pass the selectedChatModel to askQuery
    askQuery(userMessage.text, sessionId, onToken, onComplete, onError, handleNewSessionId, selectedChatModel);
  };

  const handleClearHistory = async () => {
    if (sessionId) {
      try {
        await apiDeleteChatHistory(sessionId);
        console.log(`Chat history for session ${sessionId} deleted from backend.`);
      } catch (e: any) {
        console.error("Failed to delete chat history from backend:", e);
        setError(`Could not clear history on server: ${e.message || 'Unknown error'}. Local history cleared.`);
        // Proceed to clear local session and UI anyway
      }
      localStorage.removeItem(SESSION_ID_STORAGE_KEY);
      const newSessionId = uuidv4();
      localStorage.setItem(SESSION_ID_STORAGE_KEY, newSessionId);
      setSessionId(newSessionId);
    }
    setChatHistory([]);
    if (!error) setError(''); // Clear general errors if no new error occurred during delete
  };

  const handleSavePrompt = async () => {
    const textToSave = promptToSave.trim() || currentQuestion.trim(); // Use currentQuestion if promptToSave is empty
    if (!textToSave) {
      alert('Prompt text cannot be empty.');
      return;
    }
    if (!newPromptName.trim()) {
      alert('Prompt name cannot be empty.');
      return;
    }
    try {
      const newPrompt = await apiSaveUserPrompt(newPromptName.trim(), textToSave);
      // Backend now returns the full prompt object including promptId
      setSavedPrompts(prev => [...prev, newPrompt]);
      setNewPromptName('');
      setPromptToSave('');
      // setShowPromptManager(false); // Optionally close
    } catch (e: any) {
      console.error("Error saving prompt via API:", e);
      alert(`Failed to save prompt: ${e.message || 'Unknown error'}`);
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    setCurrentQuestion(promptText);
    setShowPromptManager(false); // Close manager after selecting
  };

  const handleDeletePrompt = async (promptId: string) => {
    try {
      await apiDeleteSavedPrompt(promptId);
      setSavedPrompts(prev => prev.filter(p => p.promptId !== promptId)); // Use promptId from ApiSavedPrompt
    } catch (e: any) {
      console.error("Error deleting prompt via API:", e);
      alert(`Failed to delete prompt: ${e.message || 'Unknown error'}`);
    }
  };


  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatControls}>
        <button onClick={handleClearHistory} className={styles.clearButton} disabled={isLoading || chatHistory.length === 0}>
          Clear History
        </button>
        <button onClick={() => setShowPromptManager(prev => !prev)} className={styles.managePromptsButton}>
          {showPromptManager ? 'Hide Prompts' : 'Manage Prompts'}
        </button>
      </div>

      {showPromptManager && (
        <div className={styles.promptManager}>
          <h4>Save Current Question as Prompt:</h4>
          <div className={styles.savePromptForm}>
            <input
              type="text"
              placeholder="Prompt Name"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              className={styles.promptNameInput}
            />
            <textarea
              placeholder="Prompt Text (current question by default)"
              value={promptToSave || currentQuestion} // Use currentQuestion as default text to save
              onChange={(e) => setPromptToSave(e.target.value)}
              rows={3}
              className={styles.promptTextInput}
            />
            <button onClick={handleSavePrompt} className={styles.savePromptButton}>Save Prompt</button>
          </div>

          {savedPrompts.length > 0 && <h4>Saved Prompts:</h4>}
          <ul className={styles.savedPromptsList}>
            {savedPrompts.map(prompt => (
              <li key={prompt.promptId} className={styles.savedPromptItem}>
                <span className={styles.promptName} onClick={() => handleSelectPrompt(prompt.text)} title="Click to use this prompt">
                  {prompt.name}
                </span>
                <button onClick={() => handleDeletePrompt(prompt.promptId)} className={styles.deletePromptButton} title="Delete prompt">
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.chatHistory} aria-live="polite" role="log">
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageWrapper} ${msg.type === 'user' ? styles.userMessage : styles.aiMessage}`}
          >
            <div className={styles.messageContent}>
              <div className={styles.messageHeader}>
                <p className={styles.messageLabel}>{msg.type === 'user' ? 'You' : 'AI'}:</p>
                {msg.type === 'ai' && msg.text && (
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.text)}
                    className={styles.copyButton}
                    title="Copy AI response"
                    aria-label="Copy AI response to clipboard"
                  >
                    Copy
                  </button>
                )}
              </div>
              <p className={styles.messageText}>{msg.text}</p>
              {/* Optional: Display context for AI messages for debugging */}
              {/* {msg.type === 'ai' && msg.graphContext && (
                <details>
                  <summary>Graph Context ({msg.graphContext.length})</summary>
                  <pre style={{fontSize: '0.8em', whiteSpace: 'pre-wrap'}}>{JSON.stringify(msg.graphContext, null, 2)}</pre>
                </details>
              )} */}
              {/* {msg.type === 'ai' && msg.vectorContext && (
                <details>
                  <summary>Vector Context ({msg.vectorContext.length})</summary>
                  <pre style={{fontSize: '0.8em', whiteSpace: 'pre-wrap'}}>{JSON.stringify(msg.vectorContext, null, 2)}</pre>
                </details>
              )} */}
            </div>
          </div>
        ))}
        {isLoading && <p className={styles.aiThinking}>AI is thinking...</p>}
      </div>
      <form onSubmit={handleSubmit} className={styles.chatForm}>
        <input
          type="text"
          value={currentQuestion}
          onChange={handleInputChange}
          placeholder="Ask a question..."
          aria-label="Ask a question" // Added aria-label
          disabled={isLoading}
          className={styles.chatInput} // Uses global input style, can be overridden by this class
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
      {/* Using global .text-error utility class from index.css */}
      {error && <p className="text-error" style={{ marginTop: '10px' }} aria-live="assertive">{error}</p>}
    </div>
  );
};

export default ChatInterface;
