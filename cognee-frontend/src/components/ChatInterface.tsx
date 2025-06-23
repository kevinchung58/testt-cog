import React, { useState, FormEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { askQuery, fetchChatHistory, ApiChatMessage } from '../services/apiService';
import styles from './ChatInterface.module.css';
import { v4 as uuidv4 } from 'uuid'; // For generating client-side session ID

// const LOCAL_STORAGE_KEY = 'cogneeChatHistory'; // No longer used for history itself
const SESSION_ID_STORAGE_KEY = 'cogneeChatSessionId';

interface ChatMessage { // This is the component's internal ChatMessage type
  id: string;
  type: 'user' | 'ai';
  text: string;
  // Optional: include context items if you want to display them
  // These would need to be sent via SSE if desired with streaming text
  // graphContext?: string[];
  // vectorContext?: string[];
}

const ChatInterface: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load sessionId on mount and fetch history
  useEffect(() => {
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
  }, []);

  // This useEffect is no longer needed as history is not saved directly to local storage here.
  // // Save history to local storage whenever it changes
  // useEffect(() => {
  //   try {
  //     localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
  //   } catch (error) {
  //     console.error("Error saving chat history to local storage:", error);
  //     // Potentially alert user if storage is full or disabled
  //   }
  // }, [chatHistory]);


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

    askQuery(userMessage.text, sessionId, onToken, onComplete, onError, handleNewSessionId);
  };

  const handleClearHistory = async () => {
    if (sessionId) {
      // Optional: Call backend to delete history for this sessionId if such endpoint exists.
      // For now, just clearing client state and starting a new session.
      localStorage.removeItem(SESSION_ID_STORAGE_KEY);
      const newSessionId = uuidv4();
      localStorage.setItem(SESSION_ID_STORAGE_KEY, newSessionId);
      setSessionId(newSessionId);
    }
    setChatHistory([]);
    setError('');
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHistoryControls}>
        <button onClick={handleClearHistory} className={styles.clearButton} disabled={isLoading || chatHistory.length === 0}>
          Clear History
        </button>
      </div>
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
