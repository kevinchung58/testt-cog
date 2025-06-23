// src/components/__tests__/ChatInterface.test.tsx
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react'; // waitFor added
import userEvent from '@testing-library/user-event';
import ChatInterface from '../ChatInterface'; // Adjust path as needed
import * as apiService from '../../services/apiService'; // To mock askQuery

// Mock the apiService functions
vi.mock('../../services/apiService', async (importOriginal) => {
  const actual = await importOriginal() as typeof apiService;
  return {
    ...actual, // Preserve other exports if any that are not explicitly mocked
    askQuery: vi.fn(),
    fetchChatHistory: vi.fn(),
    // Mock other exports if they exist and are used by any part of the render tree
    // ingestFile: vi.fn(),
    // getGraphData: vi.fn(),
    // getNodeNeighbors: vi.fn(),
  };
});

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

describe('ChatInterface Component', () => {
  let mockAskQuery: vi.Mock;
  let mockFetchChatHistory: vi.Mock;
  let mockUuidV4: vi.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    mockAskQuery = apiService.askQuery as vi.Mock;
    mockFetchChatHistory = apiService.fetchChatHistory as vi.Mock;
    mockUuidV4 = require('uuid').v4 as vi.Mock;

    // Default mock implementations
    mockFetchChatHistory.mockResolvedValue([]); // Default to no history
    mockUuidV4.mockReturnValue('test-session-id'); // Default mock session ID

    // Mock localStorage
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  afterEach(() => {
    // Clear all mocks including localStorage
    vi.clearAllMocks();
  });


  it('renders the input field, send button, and clear history button initially', async () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText(/ask a question.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear history/i })).toBeInTheDocument();

    // Wait for initial history fetch (even if empty)
    await waitFor(() => {
      expect(mockFetchChatHistory).toHaveBeenCalled();
    });

    const chatHistory = screen.getByRole('log');
    expect(chatHistory).toBeInTheDocument();
    expect(chatHistory.children.length).toBe(0); // Assuming no history initially
  });

  it('allows typing in the input field', async () => {
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/ask a question.../i) as HTMLInputElement;
    await userEvent.type(input, 'Hello AI');
    expect(input.value).toBe('Hello AI');
  });

  it('submits a question, displays user message, and streams AI response', async () => {
    let onTokenCallback: (token: string) => void = () => {};
    let onCompleteCallback: () => void = () => {};

    (apiService.askQuery as vi.Mock).mockImplementation(
      // Simplified: removed async from mock implementation as it just assigns callbacks
      (question, onToken, onComplete, onError) => {
        onTokenCallback = onToken;
        onCompleteCallback = onComplete;
        // Simulate async nature of API call setup if any, before streaming starts
        // For this mock, we can call onToken and onComplete synchronously via act() later
      }
    );

    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/ask a question.../i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'What is Cognee?');
    await userEvent.click(sendButton);

    // Check user message is displayed
    expect(screen.getByText('You:')).toBeInTheDocument();
    expect(screen.getByText('What is Cognee?')).toBeInTheDocument();
    expect(input).toHaveValue(''); // Input cleared

    // Check initial AI message (empty or placeholder)
    // Need to wait for the initial empty AI message to be added to history
    await waitFor(() => {
        const aiMessages = screen.getAllByText('AI:'); // Will find all elements starting with "AI:"
        expect(aiMessages.length).toBe(1);
        const aiMessageContainer = aiMessages[0].closest('div[class*="messageContent"]');
        expect(aiMessageContainer?.querySelector('p[class*="messageText"]')?.textContent).toBe(''); // Initially empty text
    });


    // Simulate receiving tokens
    act(() => {
      onTokenCallback('Cognee ');
    });
    // Message text should update
    // Re-query the element as its content has changed
    let aiMessageContainer = screen.getAllByText((content, element) => element?.tagName.toLowerCase() === 'p' && element.className.includes('messageLabel') && content.startsWith('AI:'))[0].closest('div[class*="messageContent"]');
    expect(aiMessageContainer?.querySelector('p[class*="messageText"]')?.textContent).toBe('Cognee ');


    act(() => {
      onTokenCallback('is a ');
    });
    aiMessageContainer = screen.getAllByText((content, element) => element?.tagName.toLowerCase() === 'p' && element.className.includes('messageLabel') && content.startsWith('AI:'))[0].closest('div[class*="messageContent"]');
    expect(aiMessageContainer?.querySelector('p[class*="messageText"]')?.textContent).toBe('Cognee is a ');

    act(() => {
      onTokenCallback('project.');
    });
    aiMessageContainer = screen.getAllByText((content, element) => element?.tagName.toLowerCase() === 'p' && element.className.includes('messageLabel') && content.startsWith('AI:'))[0].closest('div[class*="messageContent"]');
    expect(aiMessageContainer?.querySelector('p[class*="messageText"]')?.textContent).toBe('Cognee is a project.');

    // Simulate stream completion
    act(() => {
      onCompleteCallback();
    });
    // Check loading state is cleared
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled();
    expect(screen.queryByText(/ai is thinking.../i)).not.toBeInTheDocument();
  });

  it('handles API error during streaming', async () => {
     let onErrorCallback: (error: Error) => void = () => {};
     (apiService.askQuery as vi.Mock).mockImplementation(
         (question, onToken, onComplete, onError) => { // Removed async
             onErrorCallback = onError;
         }
     );

     render(<ChatInterface />);
     const input = screen.getByPlaceholderText(/ask a question.../i);
     const sendButton = screen.getByRole('button', { name: /send/i });

     await userEvent.type(input, 'Error test');
     await userEvent.click(sendButton);

     // Wait for the initial empty AI message
     await waitFor(() => {
        expect(screen.getAllByText('AI:').length).toBe(1);
     });

     act(() => {
         onErrorCallback(new Error('Stream failed'));
     });

     // Check that the AI message now contains the error
     const aiMessageContainer = screen.getAllByText((content, element) => element?.tagName.toLowerCase() === 'p' && element.className.includes('messageLabel') && content.startsWith('AI:'))[0].closest('div[class*="messageContent"]');
     expect(aiMessageContainer?.querySelector('p[class*="messageText"]')?.textContent).toContain('Error: Stream failed');

     // Check that the general error display at the bottom of the form is also shown
     expect(screen.getByText(/failed to get an answer stream/i)).toBeInTheDocument();
  });

 it('shows error if submitting an empty question', async () => {
     render(<ChatInterface />);
     const sendButton = screen.getByRole('button', { name: /send/i });
     await userEvent.click(sendButton);
     expect(apiService.askQuery).not.toHaveBeenCalled();
     expect(screen.getByText(/please enter a question/i)).toBeInTheDocument();
 });

  it('loads chat history from backend on mount using stored session ID', async () => {
    const storedSessionId = 'existing-session-123';
    (Storage.prototype.getItem as vi.Mock).mockReturnValue(storedSessionId);
    const mockHistory: apiService.ApiChatMessage[] = [
      { id: '1', type: 'user', text: 'Old question' },
      { id: '2', type: 'ai', text: 'Old answer' },
    ];
    mockFetchChatHistory.mockResolvedValue(mockHistory);

    render(<ChatInterface />);

    await waitFor(() => {
      expect(Storage.prototype.getItem).toHaveBeenCalledWith('cogneeChatSessionId');
      expect(mockFetchChatHistory).toHaveBeenCalledWith(storedSessionId);
      expect(screen.getByText('Old question')).toBeInTheDocument();
      expect(screen.getByText('Old answer')).toBeInTheDocument();
    });
  });

  it('generates a new session ID if none is stored and fetches history', async () => {
    (Storage.prototype.getItem as vi.Mock).mockReturnValue(null); // No stored session ID
    mockUuidV4.mockReturnValue('newly-generated-session-id');
    mockFetchChatHistory.mockResolvedValue([]); // No history for new session

    render(<ChatInterface />);

    await waitFor(() => {
      expect(mockUuidV4).toHaveBeenCalled();
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('cogneeChatSessionId', 'newly-generated-session-id');
      expect(mockFetchChatHistory).toHaveBeenCalledWith('newly-generated-session-id');
    });
  });

  it('allows copying AI message to clipboard', async () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Setup askQuery to provide an AI message
    let onTokenCallback: (token: string) => void = () => {};
    mockAskQuery.mockImplementation(
      (question, sessionId, onToken, onComplete, onError, onSessionId) => {
        onTokenCallback = onToken;
        // Simulate session ID handling if needed for this specific test flow
        if (!sessionId) onSessionId('mock-session-for-copy-test');
      }
    );

    render(<ChatInterface />);
    const input = screen.getByPlaceholderText(/ask a question.../i);
    await userEvent.type(input, 'Test for copy');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
        expect(screen.getAllByText('AI:').length).toBe(1);
    });
    act(() => {
      onTokenCallback('AI response to copy.');
    });

    const copyButton = await screen.findByRole('button', { name: /copy ai response/i });
    expect(copyButton).toBeInTheDocument();

    await userEvent.click(copyButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AI response to copy.');
  });

  it('clears chat history and resets session ID on "Clear History" click', async () => {
    // Initial setup with some history and a session ID
    (Storage.prototype.getItem as vi.Mock).mockReturnValue('session-to-clear');
    mockFetchChatHistory.mockResolvedValue([{ id: '1', type: 'user', text: 'Message to clear' }]);

    render(<ChatInterface />);
    await waitFor(() => {
      expect(screen.getByText('Message to clear')).toBeInTheDocument();
    });

    mockUuidV4.mockReturnValue('new-session-after-clear'); // For when new session ID is generated

    const clearButton = screen.getByRole('button', { name: /clear history/i });
    await userEvent.click(clearButton);

    expect(screen.queryByText('Message to clear')).not.toBeInTheDocument();
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('cogneeChatSessionId');
    expect(mockUuidV4).toHaveBeenCalled(); // To generate new session ID
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('cogneeChatSessionId', 'new-session-after-clear');

    // Verify chat history is empty
    const chatHistoryLog = screen.getByRole('log');
    expect(chatHistoryLog.children.length).toBe(0);
  });

  describe('Saved Prompts Functionality', () => {
    const SAVED_PROMPTS_STORAGE_KEY = 'cogneeSavedPrompts';

    it('loads saved prompts from localStorage on mount', async () => {
      const mockPrompts = [{ id: 'p1', name: 'Prompt 1', text: 'What is X?' }];
      (Storage.prototype.getItem as vi.Mock).mockImplementation((key: string) => {
        if (key === SAVED_PROMPTS_STORAGE_KEY) return JSON.stringify(mockPrompts);
        if (key === 'cogneeChatSessionId') return 'test-session'; // For session ID loading
        return null;
      });

      render(<ChatInterface />);
      const managePromptsButton = screen.getByRole('button', { name: /manage prompts/i });
      await userEvent.click(managePromptsButton);

      await waitFor(() => {
        expect(screen.getByText('Prompt 1')).toBeInTheDocument();
      });
    });

    it('allows saving a new prompt', async () => {
      mockUuidV4.mockReturnValueOnce('prompt-uuid-1'); // For the prompt ID
      render(<ChatInterface />);
      const managePromptsButton = screen.getByRole('button', { name: /manage prompts/i });
      await userEvent.click(managePromptsButton);

      const promptNameInput = screen.getByPlaceholderText('Prompt Name');
      const promptTextInput = screen.getByPlaceholderText('Prompt Text (current question by default)');
      const savePromptButton = screen.getByRole('button', { name: /save prompt/i });
      const chatInput = screen.getByPlaceholderText(/ask a question.../i);

      // First, type something into the main chat input to be the default prompt text
      await userEvent.type(chatInput, 'This is the current question text.');
      // Now, type a name for the prompt
      await userEvent.type(promptNameInput, 'My Test Prompt');
      // The textarea for prompt text should have picked up the current question.
      // If we want to override, we type into promptTextInput. Here, we use the default.

      await userEvent.click(savePromptButton);

      await waitFor(() => {
        expect(Storage.prototype.setItem).toHaveBeenCalledWith(
          SAVED_PROMPTS_STORAGE_KEY,
          JSON.stringify([{ id: 'prompt-uuid-1', name: 'My Test Prompt', text: 'This is the current question text.' }])
        );
        expect(screen.getByText('My Test Prompt')).toBeInTheDocument();
      });
      // Inputs should be cleared after saving
      expect(promptNameInput).toHaveValue('');
      // promptTextInput is a textarea, its value check is slightly different
      expect(screen.getByPlaceholderText('Prompt Text (current question by default)')).toHaveValue('');
    });

    it('allows selecting a saved prompt to populate the chat input', async () => {
      const mockPrompts = [{ id: 'p1', name: 'Greeting Prompt', text: 'Hello there!' }];
      (Storage.prototype.getItem as vi.Mock).mockImplementation((key: string) => {
        if (key === SAVED_PROMPTS_STORAGE_KEY) return JSON.stringify(mockPrompts);
        return null;
      });
      render(<ChatInterface />);
      const managePromptsButton = screen.getByRole('button', { name: /manage prompts/i });
      await userEvent.click(managePromptsButton);

      const promptNameElement = await screen.findByText('Greeting Prompt');
      await userEvent.click(promptNameElement);

      expect(screen.getByPlaceholderText(/ask a question.../i)).toHaveValue('Hello there!');
      // Prompt manager should hide after selection
      expect(screen.queryByText('Save Current Question as Prompt:')).not.toBeInTheDocument();
    });

    it('allows deleting a saved prompt', async () => {
      const mockPrompts = [
        { id: 'p1', name: 'Prompt One', text: 'Text One' },
        { id: 'p2', name: 'Prompt Two', text: 'Text Two' },
      ];
      (Storage.prototype.getItem as vi.Mock).mockImplementation((key: string) => {
        if (key === SAVED_PROMPTS_STORAGE_KEY) return JSON.stringify(mockPrompts);
        return null;
      });
      render(<ChatInterface />);
      const managePromptsButton = screen.getByRole('button', { name: /manage prompts/i });
      await userEvent.click(managePromptsButton);

      const deleteButtons = await screen.findAllByRole('button', { name: /delete prompt/i });
      expect(deleteButtons.length).toBe(2);
      await userEvent.click(deleteButtons[0]); // Delete "Prompt One"

      await waitFor(() => {
        expect(screen.queryByText('Prompt One')).not.toBeInTheDocument();
        expect(screen.getByText('Prompt Two')).toBeInTheDocument();
        expect(Storage.prototype.setItem).toHaveBeenCalledWith(
          SAVED_PROMPTS_STORAGE_KEY,
          JSON.stringify([{ id: 'p2', name: 'Prompt Two', text: 'Text Two' }])
        );
      });
    });
  });
});
