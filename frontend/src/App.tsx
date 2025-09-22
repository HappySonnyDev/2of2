import React from 'react';
import SnakeGame from './components/SnakeGame';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🐍 CKB Snake Game</h1>
        <p>Play Snake and use Payment Channels to buy snake skins and board themes!</p>
      </header>
      
      <main className="app-main">
        <SnakeGame />
      </main>
      
      <footer className="app-footer">
        <p>Powered by CKB 2-of-2 Multisig Payment Channels</p>
      </footer>
    </div>
  );
}

export default App;
