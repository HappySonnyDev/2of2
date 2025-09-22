import React from 'react';

// Game state interface
interface GameState {
  snake: Position[];
  food: Position;
  direction: Direction;
  gameOver: boolean;
  score: number;
  gameRunning: boolean;
  speed: number;
}

// Position interface
interface Position {
  x: number;
  y: number;
}

// Direction type
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Snake theme interface
interface SnakeTheme {
  id: string;
  name: string;
  price: number;
  snakeColor: string;
  snakeGradient?: string;
  icon: string;
  description: string;
}

// Board theme interface
interface BoardTheme {
  id: string;
  name: string;
  price: number;
  background: string;
  gridColor: string;
  foodColor: string;
  icon: string;
  description: string;
}

// Payment Channel state
interface PaymentChannelState {
  isOpen: boolean;
  balance: number;
  capacity: number;
  transactions: string[];
}

// Snake themes data
const SNAKE_THEMES: SnakeTheme[] = [
  {
    id: 'classic',
    name: 'Classic Green',
    price: 0,
    snakeColor: '#4CAF50',
    icon: '🐍',
    description: 'The original green snake'
  },
  {
    id: 'golden',
    name: 'Golden Serpent',
    price: 15,
    snakeColor: '#FFD700',
    snakeGradient: 'linear-gradient(45deg, #FFD700, #FFA500)',
    icon: '🐲',
    description: 'Shine like gold!'
  },
  {
    id: 'fire',
    name: 'Fire Dragon',
    price: 25,
    snakeColor: '#FF4444',
    snakeGradient: 'linear-gradient(45deg, #FF4444, #FF8800)',
    icon: '🔥',
    description: 'Blazing hot snake'
  },
  {
    id: 'ice',
    name: 'Ice Crystal',
    price: 20,
    snakeColor: '#00BFFF',
    snakeGradient: 'linear-gradient(45deg, #00BFFF, #87CEEB)',
    icon: '❄️',
    description: 'Cool as ice'
  },
  {
    id: 'rainbow',
    name: 'Rainbow Serpent',
    price: 50,
    snakeColor: '#FF69B4',
    snakeGradient: 'linear-gradient(45deg, #FF69B4, #00CED1, #98FB98, #FFD700)',
    icon: '🌈',
    description: 'Magical rainbow colors'
  }
];

// Board themes data
const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic',
    name: 'Classic Grid',
    price: 0,
    background: '#1a1a1a',
    gridColor: '#333',
    foodColor: '#ff0000',
    icon: '⬛',
    description: 'Simple dark theme'
  },
  {
    id: 'neon',
    name: 'Neon Grid',
    price: 12,
    background: '#0a0a0a',
    gridColor: '#00ff00',
    foodColor: '#ff00ff',
    icon: '🌃',
    description: 'Cyberpunk neon style'
  },
  {
    id: 'forest',
    name: 'Forest Floor',
    price: 18,
    background: '#2d5016',
    gridColor: '#4a7c28',
    foodColor: '#ff6b6b',
    icon: '🌲',
    description: 'Natural forest theme'
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    price: 22,
    background: '#001f3f',
    gridColor: '#0074d9',
    foodColor: '#ff851b',
    icon: '🌊',
    description: 'Underwater adventure'
  },
  {
    id: 'space',
    name: 'Space Void',
    price: 35,
    background: '#0c0c1e',
    gridColor: '#4b0082',
    foodColor: '#ffd700',
    icon: '🚀',
    description: 'Explore the cosmos'
  }
];

const GRID_SIZE = 20;
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_FOOD: Position = { x: 15, y: 15 };

const SnakeGame: React.FC = () => {
  // Game state
  const [gameState, setGameState] = React.useState<GameState>({
    snake: INITIAL_SNAKE,
    food: INITIAL_FOOD,
    direction: 'RIGHT',
    gameOver: false,
    score: 0,
    gameRunning: false,
    speed: 150
  });

  // Theme state
  const [currentSnakeTheme, setCurrentSnakeTheme] = React.useState<string>('classic');
  const [currentBoardTheme, setCurrentBoardTheme] = React.useState<string>('classic');
  const [ownedSnakeThemes, setOwnedSnakeThemes] = React.useState<string[]>(['classic']);
  const [ownedBoardThemes, setOwnedBoardThemes] = React.useState<string[]>(['classic']);

  // Payment Channel state
  const [paymentChannel, setPaymentChannel] = React.useState<PaymentChannelState>({
    isOpen: false,
    balance: 0,
    capacity: 100,
    transactions: []
  });

  const [showThemeStore, setShowThemeStore] = React.useState(false);
  const gameAreaRef = React.useRef<HTMLDivElement>(null);
  const gameLoopRef = React.useRef<NodeJS.Timeout | null>(null);
  const directionQueue = React.useRef<Direction[]>([]);

  // Generate random food position
  const generateFood = React.useCallback((snake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Check collision (only self collision, no wall collision)
  const checkCollision = React.useCallback((head: Position, snake: Position[]): boolean => {
    // Only check self collision, no wall collision
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  // Game loop with direction queue processing
  const gameLoop = React.useCallback(() => {
    setGameState(prevState => {
      if (!prevState.gameRunning || prevState.gameOver) return prevState;

      const { snake, food } = prevState;
      let direction = prevState.direction;
      
      // Process direction queue - get next direction if available
      if (directionQueue.current.length > 0) {
        direction = directionQueue.current.shift()!; // Remove and get first direction
      }
      
      const head = { ...snake[0] };

      // Move snake head
      switch (direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Handle wall wrapping (teleport to opposite side)
      if (head.x < 0) {
        head.x = GRID_SIZE - 1; // Left wall -> Right wall
      } else if (head.x >= GRID_SIZE) {
        head.x = 0; // Right wall -> Left wall
      }
      
      if (head.y < 0) {
        head.y = GRID_SIZE - 1; // Top wall -> Bottom wall
      } else if (head.y >= GRID_SIZE) {
        head.y = 0; // Bottom wall -> Top wall
      }

      // Check collision (only self collision now)
      if (checkCollision(head, snake)) {
        return { ...prevState, gameOver: true, gameRunning: false };
      }

      const newSnake = [head, ...snake];
      let newFood = food;
      let newScore = prevState.score;

      // Check if food is eaten
      if (head.x === food.x && head.y === food.y) {
        newFood = generateFood(newSnake);
        newScore += 10;
      } else {
        newSnake.pop(); // Remove tail
      }

      return {
        ...prevState,
        snake: newSnake,
        food: newFood,
        score: newScore,
        direction: direction // Update the state direction
      };
    });
  }, [checkCollision, generateFood]);

  // Enhanced keyboard event handler with direction queue
  const handleKeyPress = React.useCallback((event: KeyboardEvent) => {
    const { key } = event;
    
    setGameState(prevState => {
      if (!prevState.gameRunning) return prevState;

      let newDirection: Direction | null = null;
      
      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newDirection = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newDirection = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newDirection = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newDirection = 'RIGHT';
          break;
      }
      
      if (newDirection) {
        // Get the last direction in queue (or current direction if queue is empty)
        const lastDirection = directionQueue.current.length > 0 
          ? directionQueue.current[directionQueue.current.length - 1]
          : prevState.direction;
        
        // Check if the new direction is valid (not opposite to the last direction)
        const isValidDirection = (
          (newDirection === 'UP' && lastDirection !== 'DOWN') ||
          (newDirection === 'DOWN' && lastDirection !== 'UP') ||
          (newDirection === 'LEFT' && lastDirection !== 'RIGHT') ||
          (newDirection === 'RIGHT' && lastDirection !== 'LEFT')
        );
        
        if (isValidDirection && newDirection !== lastDirection) {
          // Add to direction queue (max 2 directions to prevent spam)
          if (directionQueue.current.length < 2) {
            directionQueue.current.push(newDirection);
          } else {
            // Replace the last queued direction with the new one
            directionQueue.current[1] = newDirection;
          }
        }
      }
      
      return prevState;
    });
  }, []);

  // Event listeners
  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop effect
  React.useEffect(() => {
    if (gameState.gameRunning && !gameState.gameOver) {
      gameLoopRef.current = setTimeout(() => {
        gameLoop();
      }, gameState.speed);
    } else if (gameLoopRef.current) {
      clearTimeout(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    };
  }, [gameState.gameRunning, gameState.gameOver, gameState.speed, gameState.snake, gameState.direction, gameState.food]);

  // Start game
  const startGame = () => {
    directionQueue.current = []; // Clear direction queue
    setGameState({
      snake: INITIAL_SNAKE,
      food: generateFood(INITIAL_SNAKE),
      direction: 'RIGHT',
      gameOver: false,
      score: 0,
      gameRunning: true,
      speed: 150
    });
  };

  // Toggle game pause/resume
  const toggleGame = () => {
    setGameState(prev => ({ ...prev, gameRunning: !prev.gameRunning }));
  };

  // Reset game
  const resetGame = () => {
    directionQueue.current = []; // Clear direction queue
    setGameState({
      snake: INITIAL_SNAKE,
      food: generateFood(INITIAL_SNAKE),
      direction: 'RIGHT',
      gameOver: false,
      score: 0,
      gameRunning: false,
      speed: 150
    });
  };

  // Open Payment Channel
  const openPaymentChannel = () => {
    setPaymentChannel(prev => ({
      ...prev,
      isOpen: true,
      balance: prev.capacity,
      transactions: [...prev.transactions, `Channel opened with ${prev.capacity} CKB`]
    }));
  };

  // Close Payment Channel
  const closePaymentChannel = () => {
    const refund = paymentChannel.balance;
    setPaymentChannel(prev => ({
      ...prev,
      isOpen: false,
      balance: 0,
      transactions: [...prev.transactions, `Channel closed. ${refund} CKB refunded.`]
    }));
  };

  // Purchase theme
  const purchaseTheme = (themeType: 'snake' | 'board', themeId: string, price: number) => {
    if (paymentChannel.balance >= price) {
      setPaymentChannel(prev => ({
        ...prev,
        balance: prev.balance - price,
        transactions: [...prev.transactions, `Purchased ${themeType} theme for ${price} CKB`]
      }));

      if (themeType === 'snake') {
        setOwnedSnakeThemes(prev => [...prev, themeId]);
        setCurrentSnakeTheme(themeId);
      } else {
        setOwnedBoardThemes(prev => [...prev, themeId]);
        setCurrentBoardTheme(themeId);
      }
      return true;
    }
    return false;
  };

  // Get current themes
  const getCurrentSnakeTheme = () => SNAKE_THEMES.find(t => t.id === currentSnakeTheme) || SNAKE_THEMES[0];
  const getCurrentBoardTheme = () => BOARD_THEMES.find(t => t.id === currentBoardTheme) || BOARD_THEMES[0];

  // Render game area
  const renderGameArea = () => {
    const boardTheme = getCurrentBoardTheme();
    const snakeTheme = getCurrentSnakeTheme();

    return (
      <div 
        className="game-area"
        style={{
          background: boardTheme.background,
          border: `2px solid ${boardTheme.gridColor}`
        }}
        ref={gameAreaRef}
      >
        {/* Render grid */}
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const isSnake = gameState.snake.some(segment => segment.x === x && segment.y === y);
          const isFood = gameState.food.x === x && gameState.food.y === y;
          const isHead = gameState.snake[0]?.x === x && gameState.snake[0]?.y === y;

          // Determine cell class - prioritize head over body
          let cellClass = 'grid-cell';
          if (isFood) {
            cellClass += ' food';
          } else if (isHead) {
            cellClass += ' snake-head';
          } else if (isSnake) {
            cellClass += ' snake-body';
          }

          return (
            <div
              key={index}
              className={cellClass}
              style={{
                backgroundColor: isSnake 
                  ? snakeTheme.snakeColor 
                  : isFood 
                    ? boardTheme.foodColor 
                    : 'transparent',
                background: isSnake && snakeTheme.snakeGradient 
                  ? snakeTheme.snakeGradient 
                  : undefined,
                border: `1px solid ${boardTheme.gridColor}20`
              }}
            >
              {isFood && '🍎'}
              {isHead && '👀'}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="snake-game">
      <div className="game-container">
        <div className="game-main">
          {/* Game header */}
          <div className="game-header">
            <h2>🐍 CKB Snake Game</h2>
            <div className="game-stats">
              <div className="stat">
                <span>Score: {gameState.score}</span>
              </div>
              <div className="stat">
                <span>Snake Theme: {getCurrentSnakeTheme().icon} {getCurrentSnakeTheme().name}</span>
              </div>
              <div className="stat">
                <span>Board Theme: {getCurrentBoardTheme().icon} {getCurrentBoardTheme().name}</span>
              </div>
            </div>
          </div>

          {/* Game area */}
          {renderGameArea()}

          {/* Game controls */}
          <div className="game-controls">
            {!gameState.gameRunning && !gameState.gameOver && (
              <button className="control-btn start-btn" onClick={startGame}>
                🎮 Start Game
              </button>
            )}
            {gameState.gameRunning && (
              <button className="control-btn pause-btn" onClick={toggleGame}>
                ⏸️ Pause
              </button>
            )}
            {!gameState.gameRunning && gameState.snake.length > 1 && (
              <button className="control-btn resume-btn" onClick={toggleGame}>
                ▶️ Resume
              </button>
            )}
            <button className="control-btn reset-btn" onClick={resetGame}>
              🔄 Reset
            </button>
            <button 
              className="control-btn theme-btn" 
              onClick={() => setShowThemeStore(!showThemeStore)}
            >
              🎨 Themes
            </button>
          </div>

          {gameState.gameOver && (
            <div className="game-over">
              <h3>🎯 Game Over!</h3>
              <p>Final Score: {gameState.score}</p>
              <button className="control-btn start-btn" onClick={startGame}>
                🎮 Play Again
              </button>
            </div>
          )}

          {/* Game instructions */}
          <div className="game-instructions">
            <h4>How to Play:</h4>
            <p>Use arrow keys or WASD to control the snake. Eat apples to grow and earn points!</p>
            <p>💡 Purchase snake skins and board themes with CKB through Payment Channels!</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="game-sidebar">
          {/* Payment Channel panel */}
          <div className="payment-channel-panel">
            <h3>💳 Payment Channel</h3>
            
            {!paymentChannel.isOpen ? (
              <div className="channel-closed">
                <p>Open a payment channel to buy themes!</p>
                <button className="open-channel-btn" onClick={openPaymentChannel}>
                  🚀 Open Channel ({paymentChannel.capacity} CKB)
                </button>
                <div className="channel-info">
                  <small>Secure 2-of-2 multisig with timelock protection</small>
                </div>
              </div>
            ) : (
              <div className="channel-open">
                <div className="channel-status">
                  <div className="channel-stat">
                    <span>Available:</span>
                    <span className="channel-balance">{paymentChannel.balance} CKB</span>
                  </div>
                  <div className="channel-stat">
                    <span>Capacity:</span>
                    <span>{paymentChannel.capacity} CKB</span>
                  </div>
                </div>
                
                <button className="close-channel-btn" onClick={closePaymentChannel}>
                  🤝 Close Channel
                </button>
              </div>
            )}

            {/* Transaction logs */}
            {paymentChannel.transactions.length > 0 && (
              <div className="channel-logs">
                <h4>📋 Recent Transactions</h4>
                <div className="logs">
                  {paymentChannel.transactions.slice(-3).map((tx, index) => (
                    <div key={index} className="log-entry">{tx}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme store */}
          {showThemeStore && (
            <div className="theme-store">
              <h3>🎨 Theme Store</h3>
              
              {!paymentChannel.isOpen ? (
                <div className="store-locked">
                  <p>🔒 Open payment channel to buy themes</p>
                </div>
              ) : (
                <div className="store-content">
                  {/* Snake themes */}
                  <div className="theme-section">
                    <h4>🐍 Snake Skins</h4>
                    <div className="theme-grid">
                      {SNAKE_THEMES.map(theme => {
                        const isOwned = ownedSnakeThemes.includes(theme.id);
                        const isCurrent = currentSnakeTheme === theme.id;
                        const canAfford = paymentChannel.balance >= theme.price;
                        
                        return (
                          <div key={theme.id} className={`theme-item ${isCurrent ? 'current' : ''} ${!isOwned && !canAfford ? 'disabled' : ''}`}>
                            <div className="theme-preview" style={{ background: theme.snakeGradient || theme.snakeColor }}>
                              <span className="theme-icon">{theme.icon}</span>
                            </div>
                            <div className="theme-info">
                              <div className="theme-name">{theme.name}</div>
                              <div className="theme-desc">{theme.description}</div>
                              <div className="theme-actions">
                                {isOwned ? (
                                  isCurrent ? (
                                    <span className="current-label">✅ Current</span>
                                  ) : (
                                    <button 
                                      className="select-btn"
                                      onClick={() => setCurrentSnakeTheme(theme.id)}
                                    >
                                      Select
                                    </button>
                                  )
                                ) : (
                                  <div className="theme-purchase">
                                    <span className="theme-price">{theme.price} CKB</span>
                                    <button 
                                      className="buy-btn"
                                      disabled={!canAfford}
                                      onClick={() => purchaseTheme('snake', theme.id, theme.price)}
                                    >
                                      Buy
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Board themes */}
                  <div className="theme-section">
                    <h4>🎲 Board Themes</h4>
                    <div className="theme-grid">
                      {BOARD_THEMES.map(theme => {
                        const isOwned = ownedBoardThemes.includes(theme.id);
                        const isCurrent = currentBoardTheme === theme.id;
                        const canAfford = paymentChannel.balance >= theme.price;
                        
                        return (
                          <div key={theme.id} className={`theme-item ${isCurrent ? 'current' : ''} ${!isOwned && !canAfford ? 'disabled' : ''}`}>
                            <div className="theme-preview" style={{ background: theme.background, border: `2px solid ${theme.gridColor}` }}>
                              <span className="theme-icon">{theme.icon}</span>
                            </div>
                            <div className="theme-info">
                              <div className="theme-name">{theme.name}</div>
                              <div className="theme-desc">{theme.description}</div>
                              <div className="theme-actions">
                                {isOwned ? (
                                  isCurrent ? (
                                    <span className="current-label">✅ Current</span>
                                  ) : (
                                    <button 
                                      className="select-btn"
                                      onClick={() => setCurrentBoardTheme(theme.id)}
                                    >
                                      Select
                                    </button>
                                  )
                                ) : (
                                  <div className="theme-purchase">
                                    <span className="theme-price">{theme.price} CKB</span>
                                    <button 
                                      className="buy-btn"
                                      disabled={!canAfford}
                                      onClick={() => purchaseTheme('board', theme.id, theme.price)}
                                    >
                                      Buy
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;