import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
      setNameInput(savedName);
    }
  }, []);

  const handleNameChange = (e) => {
    const value = e.target.value;
    setNameInput(value);
    
    if (value.trim().length > 50) {
      setNameError('Name must be 50 characters or less');
    } else if (value.includes('<') || value.includes('>')) {
      setNameError('Name cannot contain < or > characters');
    } else {
      setNameError('');
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    
    if (trimmedName && !nameError) {
      setUserName(trimmedName);
      localStorage.setItem('userName', trimmedName);
    } else if (!trimmedName) {
      setNameError('Please enter a name');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Benchmark React App</h1>
        
        <form className="name-form" onSubmit={handleNameSubmit}>
          <label htmlFor="nameInput">Enter your name:</label>
          <div className="name-input-container">
            <input
              id="nameInput"
              type="text"
              value={nameInput}
              onChange={handleNameChange}
              placeholder="Your name"
              maxLength={50}
            />
            <button type="submit" disabled={!nameInput.trim() || !!nameError}>
              Save
            </button>
          </div>
          {nameError && <p className="error-message">{nameError}</p>}
        </form>

        <div className="counter">
          <p className="greeting">
            {userName 
              ? `Hello ${userName}, your count is: ${count}` 
              : `Hello there, your count is: ${count}`}
          </p>
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