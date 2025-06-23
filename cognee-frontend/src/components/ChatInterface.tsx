import React, { useState, FormEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { askQuery } from '../services/apiService';
import styles from './ChatInterface.module.css';

const LOCAL_STORAGE_KEY = 'cogneeChatHistory';

interface ChatMessage {
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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    // Load history from local storage on initial load
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
      console.error("Error loading chat history from local storage:", error);
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Save history to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (error) {
      console.error("Error saving chat history to local storage:", error);
      // Potentially alert user if storage is full or disabled
    }
  }, [chatHistory]);


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
    setCurrentQuestion(''); // Clear input field immediately after sending

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

    askQuery(userMessage.text, onToken, onComplete, onError);
  };

  const handleClearHistory = () => {
    setChatHistory([]);
    // localStorage.removeItem(LOCAL_STORAGE_KEY); // This is handled by the useEffect when chatHistory becomes []
    setError(''); // Also clear any errors
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
