import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

const STORAGE_KEY_NAME = 'userName';
const MAX_NAME_LENGTH = 50;
const MIN_NAME_LENGTH = 1;
const DEFAULT_GREETING = 'Hello there';

function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isNameSaved, setIsNameSaved] = useState(false);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem(STORAGE_KEY_NAME);
      if (savedName) {
        setName(savedName);
        setIsNameSaved(true);
      }
    } catch (error) {
    }
  }, []);

  const validateName = useCallback((value) => {
    if (value.length > MAX_NAME_LENGTH) {
      return `Name must be ${MAX_NAME_LENGTH} characters or less`;
    }
    if (value.trim().length > 0 && value.trim().length < MIN_NAME_LENGTH) {
      return `Name must be at least ${MIN_NAME_LENGTH} character`;
    }
    if (!/^[a-zA-Z\s]*$/.test(value)) {
      return 'Name can only contain letters and spaces';
    }
    return '';
  }, []);

  const handleNameChange = useCallback((e) => {
    const newName = e.target.value;
    setName(newName);
    
    const error = validateName(newName);
    setNameError(error);
    
    if (!error && newName.trim()) {
      try {
        localStorage.setItem(STORAGE_KEY_NAME, newName.trim());
        setIsNameSaved(true);
      } catch (error) {
        setNameError('Unable to save name');
      }
    } else if (!newName.trim()) {
      try {
        localStorage.removeItem(STORAGE_KEY_NAME);
        setIsNameSaved(false);
      } catch (error) {
      }
    }
  }, [validateName]);

  const greeting = useMemo(() => {
    const userName = name.trim() || DEFAULT_GREETING;
    return `${name.trim() ? `Hello ${userName}` : DEFAULT_GREETING}, your count is: ${count}`;
  }, [name, count]);

  const incrementCount = useCallback(() => setCount(prev => prev + 1), []);
  const decrementCount = useCallback(() => setCount(prev => prev - 1), []);
  const resetCount = useCallback(() => setCount(0), []);

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
            aria-label="User name input"
            aria-describedby={nameError ? "name-error" : undefined}
            aria-invalid={!!nameError}
          />
          {nameError && (
            <div id="name-error" role="alert" className="error-message">
              {nameError}
            </div>
          )}
          {isNameSaved && !nameError && name.trim() && (
            <div className="success-message" role="status">
              Name saved
            </div>
          )}
        </div>
        
        <div className="counter">
          <p className="greeting">{greeting}</p>
          <button onClick={incrementCount} aria-label="Increment count">
            Increment
          </button>
          <button onClick={decrementCount} aria-label="Decrement count">
            Decrement
          </button>
          <button onClick={resetCount} aria-label="Reset count">
            Reset
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;