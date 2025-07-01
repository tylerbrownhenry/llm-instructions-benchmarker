import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Benchmark React App')).toBeInTheDocument();
  });

  test('displays initial count of 0', () => {
    render(<App />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  test('increments count when increment button is clicked', () => {
    render(<App />);
    const incrementButton = screen.getByText('Increment');
    fireEvent.click(incrementButton);
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  test('decrements count when decrement button is clicked', () => {
    render(<App />);
    const decrementButton = screen.getByText('Decrement');
    fireEvent.click(decrementButton);
    expect(screen.getByText('Count: -1')).toBeInTheDocument();
  });

  test('resets count when reset button is clicked', () => {
    render(<App />);
    const incrementButton = screen.getByText('Increment');
    const resetButton = screen.getByText('Reset');
    
    // Increment a few times
    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    expect(screen.getByText('Count: 2')).toBeInTheDocument();
    
    // Reset
    fireEvent.click(resetButton);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  describe('Name Input Feature', () => {
    test('renders name input field', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      expect(nameInput).toBeInTheDocument();
    });

    test('displays default greeting when no name is entered', () => {
      render(<App />);
      expect(screen.getByText('Hello there, your count is: 0')).toBeInTheDocument();
    });

    test('displays personalized greeting when name is entered', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'John' } });
      expect(screen.getByText('Hello John, your count is: 0')).toBeInTheDocument();
    });

    test('updates greeting when count changes', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      const incrementButton = screen.getByText('Increment');
      
      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.click(incrementButton);
      
      expect(screen.getByText('Hello Alice, your count is: 1')).toBeInTheDocument();
    });

    test('persists name to localStorage when entered', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: 'Bob' } });
      
      expect(localStorage.getItem('userName')).toBe('Bob');
    });

    test('loads name from localStorage on mount', () => {
      localStorage.setItem('userName', 'Charlie');
      render(<App />);
      
      const nameInput = screen.getByPlaceholderText('Enter your name');
      expect(nameInput.value).toBe('Charlie');
      expect(screen.getByText('Hello Charlie, your count is: 0')).toBeInTheDocument();
    });

    test('validates name input - shows error for empty name after interaction', async () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
      });
    });

    test('validates name input - shows error for names with only spaces', async () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
      });
    });

    test('validates name input - shows error for names exceeding max length', async () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      const longName = 'a'.repeat(51);
      
      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Name must be 50 characters or less')).toBeInTheDocument();
      });
    });

    test('clears error message when valid name is entered', async () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
      });
      
      fireEvent.change(nameInput, { target: { value: 'ValidName' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Name cannot be empty')).not.toBeInTheDocument();
      });
    });

    test('trims whitespace from name input', () => {
      render(<App />);
      const nameInput = screen.getByPlaceholderText('Enter your name');
      
      fireEvent.change(nameInput, { target: { value: '  Jane  ' } });
      
      expect(screen.getByText('Hello Jane, your count is: 0')).toBeInTheDocument();
      expect(localStorage.getItem('userName')).toBe('Jane');
    });
  });
});