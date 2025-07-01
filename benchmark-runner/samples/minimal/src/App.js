import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setName(savedName);
      setNameInput(savedName);
    }
  }, []);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    
    if (trimmedName.length === 0) {
      setError('Please enter a valid name');
      return;
    }
    
    if (trimmedName.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }
    
    setError('');
    setName(trimmedName);
    localStorage.setItem('userName', trimmedName);
  };

  const greeting = name 
    ? `Hello ${name}, your count is: ${count}`
    : `Hello there, your count is: ${count}`;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Benchmark React App</h1>
        <form onSubmit={handleNameSubmit} className="name-form">
          <input
            type="text"
            placeholder="Enter your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="name-input"
          />
          <button type="submit">Save Name</button>
          {error && <p className="error-message">{error}</p>}
        </form>
        <div className="counter">
          <p>{greeting}</p>
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