import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

describe('App Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset all mocks
    jest.clearAllMocks();
    // Reset any mock implementations
    localStorage.getItem.mockReset();
    localStorage.setItem.mockReset();
  });

  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Benchmark React App')).toBeInTheDocument();
  });

  test('displays initial count of 0', () => {
    render(<App />);
    expect(screen.getByText('Hello there, your count is: 0')).toBeInTheDocument();
  });

  test('increments count when increment button is clicked', () => {
    render(<App />);
    const incrementButton = screen.getByText('Increment');
    fireEvent.click(incrementButton);
    expect(screen.getByText('Hello there, your count is: 1')).toBeInTheDocument();
  });

  test('decrements count when decrement button is clicked', () => {
    render(<App />);
    const decrementButton = screen.getByText('Decrement');
    fireEvent.click(decrementButton);
    expect(screen.getByText('Hello there, your count is: -1')).toBeInTheDocument();
  });

  test('resets count when reset button is clicked', () => {
    render(<App />);
    const incrementButton = screen.getByText('Increment');
    const resetButton = screen.getByText('Reset');
    
    // Increment a few times
    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    expect(screen.getByText('Hello there, your count is: 2')).toBeInTheDocument();
    
    // Reset
    fireEvent.click(resetButton);
    expect(screen.getByText('Hello there, your count is: 0')).toBeInTheDocument();
  });

  describe('Name Input Feature', () => {
    test('renders name input field', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      expect(nameInput).toBeInTheDocument();
    });

    test('displays personalized greeting when name is entered', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: 'John' } });
      
      expect(screen.getByText('Hello John, your count is: 0')).toBeInTheDocument();
    });

    test('displays default greeting when no name is entered', () => {
      // Ensure localStorage is empty
      localStorage.getItem.mockReturnValue(null);
      
      render(<App />);
      expect(screen.getByText('Hello there, your count is: 0')).toBeInTheDocument();
    });

    test('saves name to localStorage when entered', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: 'Jane' } });
      
      expect(localStorage.setItem).toHaveBeenCalledWith('userName', 'Jane');
    });

    test('loads name from localStorage on mount', () => {
      localStorage.getItem.mockReturnValue('Sarah');
      
      render(<App />);
      
      expect(localStorage.getItem).toHaveBeenCalledWith('userName');
      expect(screen.getByText('Hello Sarah, your count is: 0')).toBeInTheDocument();
    });

    test('persists name across component remounts', () => {
      // First render with a mocked localStorage value
      localStorage.getItem.mockReturnValue('Mike');
      
      const { unmount } = render(<App />);
      expect(screen.getByText('Hello Mike, your count is: 0')).toBeInTheDocument();
      
      // Unmount and remount to test persistence
      unmount();
      
      // The value should still be in localStorage
      localStorage.getItem.mockReturnValue('Mike');
      render(<App />);
      expect(screen.getByText('Hello Mike, your count is: 0')).toBeInTheDocument();
    });

    test('updates greeting when name changes', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      // First name
      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      expect(screen.getByText('Hello Alice, your count is: 0')).toBeInTheDocument();
      
      // Change name
      fireEvent.change(nameInput, { target: { value: 'Bob' } });
      expect(screen.getByText('Hello Bob, your count is: 0')).toBeInTheDocument();
    });

    test('trims whitespace from name input', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: '  David  ' } });
      
      expect(screen.getByText('Hello David, your count is: 0')).toBeInTheDocument();
      expect(localStorage.setItem).toHaveBeenCalledWith('userName', 'David');
    });

    test('shows default greeting for empty or whitespace-only name', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      // Empty string
      fireEvent.change(nameInput, { target: { value: '' } });
      expect(screen.getByText('Hello there, your count is: 0')).toBeInTheDocument();
      
      // Whitespace only
      fireEvent.change(nameInput, { target: { value: '   ' } });
      expect(screen.getByText('Hello there, your count is: 0')).toBeInTheDocument();
    });

    test('clears localStorage when name is cleared', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      // Set a name
      fireEvent.change(nameInput, { target: { value: 'Emma' } });
      expect(localStorage.setItem).toHaveBeenCalledWith('userName', 'Emma');
      
      // Clear the name
      fireEvent.change(nameInput, { target: { value: '' } });
      expect(localStorage.setItem).toHaveBeenCalledWith('userName', '');
    });

    test('greeting updates with count changes', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      const incrementButton = screen.getByText('Increment');
      
      fireEvent.change(nameInput, { target: { value: 'Frank' } });
      expect(screen.getByText('Hello Frank, your count is: 0')).toBeInTheDocument();
      
      fireEvent.click(incrementButton);
      expect(screen.getByText('Hello Frank, your count is: 1')).toBeInTheDocument();
    });

    test('handles localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not crash when localStorage fails
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      // This should not throw
      fireEvent.change(nameInput, { target: { value: 'Grace' } });
      expect(screen.getByText('Hello Grace, your count is: 0')).toBeInTheDocument();
    });

    test('handles null localStorage value', () => {
      localStorage.getItem.mockReturnValue(null);
      
      render(<App />);
      
      expect(screen.getByText('Hello there, your count is: 0')).toBeInTheDocument();
    });

    test('validates name input length', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      // Very long name (over 50 characters)
      const longName = 'A'.repeat(51);
      fireEvent.change(nameInput, { target: { value: longName } });
      
      // Should truncate to 50 characters
      expect(screen.getByText(`Hello ${'A'.repeat(50)}, your count is: 0`)).toBeInTheDocument();
    });

    test('sanitizes HTML in name input', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: '<script>alert("XSS")</script>' } });
      
      // Should display the text safely without executing scripts
      expect(screen.getByText('Hello <script>alert("XSS")</script>, your count is: 0')).toBeInTheDocument();
    });
  });
});