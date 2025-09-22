import React from 'react';

const WalletConnector: React.FC = () => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [address, setAddress] = React.useState('');
  const [isConnecting, setIsConnecting] = React.useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    // Simulate wallet connection
    setTimeout(() => {
      setIsConnected(true);
      setAddress('ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq2qf8keemy2p5uu0g0gn8cd4gz4');
      setIsConnecting(false);
    }, 1000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress('');
  };

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <span className="wallet-icon">🔗</span>
          <span className="wallet-address">{address.slice(0, 10)}...{address.slice(-8)}</span>
        </div>
        <button 
          className="disconnect-button"
          onClick={handleDisconnect}
          title="Disconnect Wallet"
        >
          🚪 Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-disconnected">
      <button 
        className="connect-button"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            ⏳ Connecting...
          </>
        ) : (
          <>
            💼 Connect Wallet
          </>
        )}
      </button>
    </div>
  );
};

export default WalletConnector;