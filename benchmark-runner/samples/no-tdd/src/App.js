import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
      setInputValue(savedName);
    }
  }, []);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    const trimmedName = inputValue.trim();
    
    if (trimmedName.length === 0) {
      setError('Please enter a valid name');
      return;
    }
    
    if (trimmedName.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }
    
    setError('');
    setUserName(trimmedName);
    localStorage.setItem('userName', trimmedName);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (error) {
      setError('');
    }
  };

  const getGreeting = () => {
    if (userName) {
      return `Hello ${userName}, your count is: ${count}`;
    }
    return `Hello there, your count is: ${count}`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Benchmark React App</h1>
        <form className="name-form" onSubmit={handleNameSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter your name"
            className="name-input"
            maxLength="50"
          />
          <button type="submit" className="name-submit">
            Set Name
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
        <div className="counter">
          <p className="greeting">{getGreeting()}</p>
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