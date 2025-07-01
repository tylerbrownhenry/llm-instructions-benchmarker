import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleNameChange = (e) => {
    const newName = e.target.value;
    const trimmedName = newName.trim();

    if (touched) {
      if (trimmedName === '') {
        setError('Name cannot be empty');
      } else if (trimmedName.length > 50) {
        setError('Name must be 50 characters or less');
      } else {
        setError('');
      }
    }

    setName(newName);
    
    if (trimmedName !== '') {
      localStorage.setItem('userName', trimmedName);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const trimmedName = name.trim();
    
    if (trimmedName === '') {
      setError('Name cannot be empty');
    } else if (trimmedName.length > 50) {
      setError('Name must be 50 characters or less');
    }
  };

  const getGreeting = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      return `Hello ${trimmedName}, your count is: ${count}`;
    }
    return `Hello there, your count is: ${count}`;
  };

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
            onBlur={handleBlur}
          />
          {error && <p className="error-message">{error}</p>}
        </div>
        <p className="greeting">{getGreeting()}</p>
        <div className="counter">
          <p>Count: {count}</p>
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