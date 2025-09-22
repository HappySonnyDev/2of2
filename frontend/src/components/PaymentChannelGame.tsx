import React from 'react';

// Game state and player data
interface GameState {
  // Player stats
  ckbBalance: number;           // Player's in-game CKB balance
  clickPower: number;           // CKB per click
  autoMineRate: number;         // CKB per second from auto miners
  totalMined: number;           // Total CKB mined in this session
  
  // Upgrades
  clickUpgradeLevel: number;    // Click power upgrade level
  autoMinerCount: number;       // Number of auto miners
  
  // Payment channel state
  channelOpen: boolean;
  channelBalance: number;       // How much CKB is available to spend
  channelCapacity: number;      // Total channel capacity
}

// Store items that players can buy with Payment Channel funds
interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  effect: string;
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: 'click_upgrade',
    name: 'Enhanced Mining Drill',
    description: 'Increases your clicking power',
    price: 10,
    icon: '⛏️',
    effect: '+5 CKB per click'
  },
  {
    id: 'auto_miner',
    name: 'Auto Mining Rig',
    description: 'Automatically mines CKB for you',
    price: 25,
    icon: '🤖',
    effect: '+2 CKB per second'
  },
  {
    id: 'speed_boost',
    name: 'Quantum Accelerator',
    description: 'Temporarily doubles all mining rates',
    price: 50,
    icon: '⚡',
    effect: '2x speed for 60 seconds'
  },
  {
    id: 'mega_drill',
    name: 'Mega Mining Complex',
    description: 'Massive upgrade to clicking power',
    price: 100,
    icon: '🏭',
    effect: '+50 CKB per click'
  }
];

const CKBMiningGame: React.FC = () => {
  const [gameState, setGameState] = React.useState<GameState>({
    ckbBalance: 0,
    clickPower: 1,
    autoMineRate: 0,
    totalMined: 0,
    clickUpgradeLevel: 0,
    autoMinerCount: 0,
    channelOpen: false,
    channelBalance: 0,
    channelCapacity: 100
  });
  
  const [speedBoostActive, setSpeedBoostActive] = React.useState(false);
  const [speedBoostTime, setSpeedBoostTime] = React.useState(0);
  const [showPaymentChannel, setShowPaymentChannel] = React.useState(false);
  const [channelLogs, setChannelLogs] = React.useState<string[]>([]);

  // Auto mining effect
  React.useEffect(() => {
    if (gameState.autoMineRate > 0) {
      const interval = setInterval(() => {
        const multiplier = speedBoostActive ? 2 : 1;
        const mineAmount = (gameState.autoMineRate * multiplier) / 10; // Update every 100ms
        
        setGameState(prev => ({
          ...prev,
          ckbBalance: prev.ckbBalance + mineAmount,
          totalMined: prev.totalMined + mineAmount
        }));
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [gameState.autoMineRate, speedBoostActive]);
  
  // Speed boost timer
  React.useEffect(() => {
    if (speedBoostActive && speedBoostTime > 0) {
      const timer = setTimeout(() => {
        setSpeedBoostTime(prev => {
          if (prev <= 1) {
            setSpeedBoostActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [speedBoostActive, speedBoostTime]);

  const addChannelLog = (message: string) => {
    setChannelLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Mining click handler
  const handleMiningClick = () => {
    const multiplier = speedBoostActive ? 2 : 1;
    const mineAmount = gameState.clickPower * multiplier;
    
    setGameState(prev => ({
      ...prev,
      ckbBalance: prev.ckbBalance + mineAmount,
      totalMined: prev.totalMined + mineAmount
    }));
  };

  // Open payment channel
  const openPaymentChannel = () => {
    setGameState(prev => ({
      ...prev,
      channelOpen: true,
      channelBalance: prev.channelCapacity
    }));
    addChannelLog('Payment channel opened with 100 CKB capacity');
    addChannelLog('Ready to purchase upgrades!');
  };

  // Make payment through channel
  const makeChannelPayment = (amount: number, item: StoreItem) => {
    if (gameState.channelBalance >= amount) {
      setGameState(prev => ({
        ...prev,
        channelBalance: prev.channelBalance - amount
      }));
      
      // Apply item effect
      applyItemEffect(item);
      addChannelLog(`Purchased ${item.name} for ${amount} CKB`);
      
      return true;
    }
    return false;
  };

  // Apply purchased item effects
  const applyItemEffect = (item: StoreItem) => {
    switch (item.id) {
      case 'click_upgrade':
        setGameState(prev => ({
          ...prev,
          clickPower: prev.clickPower + 5,
          clickUpgradeLevel: prev.clickUpgradeLevel + 1
        }));
        break;
        
      case 'auto_miner':
        setGameState(prev => ({
          ...prev,
          autoMineRate: prev.autoMineRate + 2,
          autoMinerCount: prev.autoMinerCount + 1
        }));
        break;
        
      case 'speed_boost':
        setSpeedBoostActive(true);
        setSpeedBoostTime(60);
        break;
        
      case 'mega_drill':
        setGameState(prev => ({
          ...prev,
          clickPower: prev.clickPower + 50,
          clickUpgradeLevel: prev.clickUpgradeLevel + 10
        }));
        break;
    }
  };

  // Close payment channel (cooperative)
  const closePaymentChannel = () => {
    const remaining = gameState.channelBalance;
    setGameState(prev => ({
      ...prev,
      channelOpen: false,
      channelBalance: 0
    }));
    addChannelLog(`Channel closed. ${remaining} CKB refunded.`);
  };

  // Reset game
  const resetGame = () => {
    setGameState({
      ckbBalance: 0,
      clickPower: 1,
      autoMineRate: 0,
      totalMined: 0,
      clickUpgradeLevel: 0,
      autoMinerCount: 0,
      channelOpen: false,
      channelBalance: 0,
      channelCapacity: 100
    });
    setSpeedBoostActive(false);
    setSpeedBoostTime(0);
    setChannelLogs([]);
  };

  return (
    <div className="ckb-mining-game">
      <div className="game-container">
        <div className="game-main">
          {/* Game Header */}
          <div className="game-header">
            <h2>⛏️ CKB Mining Clicker</h2>
            <div className="game-stats">
              <div className="stat">
                <span className="stat-label">Mined CKB:</span>
                <span className="stat-value">{gameState.ckbBalance.toFixed(1)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Click Power:</span>
                <span className="stat-value">{gameState.clickPower}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Auto Rate:</span>
                <span className="stat-value">{gameState.autoMineRate}/sec</span>
              </div>
              <div className="stat">
                <span className="stat-label">Total Mined:</span>
                <span className="stat-value">{gameState.totalMined.toFixed(1)}</span>
              </div>
            </div>
            
            {speedBoostActive && (
              <div className="speed-boost-indicator">
                ⚡ SPEED BOOST ACTIVE: {speedBoostTime}s remaining
              </div>
            )}
          </div>

          {/* Mining Area */}
          <div className="mining-area">
            <div className="mining-description">
              <p>Click the CKB crystal to mine! Use the Payment Channel to buy upgrades and boost your mining power.</p>
            </div>
            
            <div className="mining-crystal-container">
              <button 
                className={`mining-crystal ${speedBoostActive ? 'boosted' : ''}`}
                onClick={handleMiningClick}
              >
                <div className="crystal-icon">💎</div>
                <div className="crystal-text">MINE CKB</div>
                <div className="crystal-power">+{gameState.clickPower * (speedBoostActive ? 2 : 1)}</div>
              </button>
            </div>
            
            <div className="mining-info">
              <div className="upgrade-status">
                <div>⛏️ Mining Drill Level: {gameState.clickUpgradeLevel}</div>
                <div>🤖 Auto Miners: {gameState.autoMinerCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Channel & Store */}
        <div className="game-sidebar">
          {/* Payment Channel Status */}
          <div className="payment-channel-panel">
            <h3>💳 Payment Channel</h3>
            
            {!gameState.channelOpen ? (
              <div className="channel-closed">
                <p>Open a payment channel to access the upgrade store!</p>
                <button className="open-channel-btn" onClick={openPaymentChannel}>
                  🚀 Open Channel (100 CKB)
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
                    <span className="channel-balance">{gameState.channelBalance} CKB</span>
                  </div>
                  <div className="channel-stat">
                    <span>Capacity:</span>
                    <span>{gameState.channelCapacity} CKB</span>
                  </div>
                </div>
                
                <div className="channel-actions">
                  <button 
                    className="close-channel-btn" 
                    onClick={closePaymentChannel}
                    title="Cooperative channel closure"
                  >
                    🤝 Close Channel
                  </button>
                </div>
              </div>
            )}
            
            {/* Channel Logs */}
            {channelLogs.length > 0 && (
              <div className="channel-logs">
                <h4>📋 Channel Activity</h4>
                <div className="logs">
                  {channelLogs.map((log, index) => (
                    <div key={index} className="log-entry">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upgrade Store */}
          <div className="upgrade-store">
            <h3>🛒 Upgrade Store</h3>
            
            {!gameState.channelOpen ? (
              <div className="store-locked">
                <p>🔒 Open payment channel to access store</p>
              </div>
            ) : (
              <div className="store-items">
                {STORE_ITEMS.map(item => {
                  const canAfford = gameState.channelBalance >= item.price;
                  return (
                    <div key={item.id} className={`store-item ${!canAfford ? 'disabled' : ''}`}>
                      <div className="item-header">
                        <span className="item-icon">{item.icon}</span>
                        <span className="item-name">{item.name}</span>
                      </div>
                      <div className="item-description">{item.description}</div>
                      <div className="item-effect">{item.effect}</div>
                      <div className="item-footer">
                        <span className="item-price">{item.price} CKB</span>
                        <button 
                          className="buy-button"
                          disabled={!canAfford}
                          onClick={() => makeChannelPayment(item.price, item)}
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Game Controls */}
          <div className="game-controls">
            <button className="reset-button" onClick={resetGame}>
              🔄 Reset Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CKBMiningGame;d funds</p>
              
              <h4>⏰ Timelock Protection:</h4>
              <p>Buyer can recover funds after 7 days if seller becomes uncooperative</p>
              
              <h4>🤝 Cooperative Closure:</h4>
              <p>Both parties can close channel instantly and fairly distribute funds</p>
              
              <h4>⚔️ Dispute Resolution:</h4>
              <p>Buyer can claim refund unilaterally after timelock expires</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentChannelGame;