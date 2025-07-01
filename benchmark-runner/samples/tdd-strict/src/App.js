import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleNameChange = (e) => {
    let newName = e.target.value;
    
    // Truncate if longer than 50 characters
    if (newName.length > 50) {
      newName = newName.substring(0, 50);
    }
    
    setName(newName);
    
    // Save trimmed name to localStorage
    const trimmedName = newName.trim();
    
    try {
      localStorage.setItem('userName', trimmedName);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  const displayName = name.trim() || 'there';
  const truncatedDisplayName = displayName.length > 50 ? displayName.substring(0, 50) : displayName;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Benchmark React App</h1>
        <div className="name-input-container">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={handleNameChange}
          />
        </div>
        <div className="counter">
          <p>Hello {truncatedDisplayName}, your count is: {count}</p>
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