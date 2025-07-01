import React, { useState, useEffect } from 'react';
import './App.css';

const DEFAULT_GREETING = 'Hello there';
const STORAGE_KEY = 'userName';
const MAX_NAME_LENGTH = 50;

function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem(STORAGE_KEY);
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleNameChange = (event) => {
    const newName = event.target.value;
    
    if (newName.length > MAX_NAME_LENGTH) {
      setNameError(`Name must be ${MAX_NAME_LENGTH} characters or less`);
      return;
    }
    
    if (newName && !/^[a-zA-Z\s'-]+$/.test(newName)) {
      setNameError('Name can only contain letters, spaces, hyphens, and apostrophes');
      return;
    }
    
    setNameError('');
    setName(newName);
    
    if (newName) {
      localStorage.setItem(STORAGE_KEY, newName);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const greeting = name ? `Hello ${name}` : DEFAULT_GREETING;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Benchmark React App</h1>
        <div className="name-input-container">
          <label htmlFor="name-input">
            Enter your name:
          </label>
          <input
            id="name-input"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Your name"
            maxLength={MAX_NAME_LENGTH}
            aria-describedby={nameError ? 'name-error' : undefined}
          />
          {nameError && (
            <span id="name-error" className="error-message" role="alert">
              {nameError}
            </span>
          )}
        </div>
        <div className="counter">
          <p>{greeting}, your count is: {count}</p>
          <button onClick={() => setCount(count + 1)}>
            Increment
          </button>
          <button onClick={() => setCount(count - 1)}>
            Decrement
          </button>
          <button onClick={() => setCount(0)}>
            Reset
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;