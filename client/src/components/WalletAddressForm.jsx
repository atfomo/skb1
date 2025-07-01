import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WalletAddressForm = ({ token }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {

    const fetchWallet = async () => {
      try {
        const res = await axios.get('https://api.atfomo.com/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWalletAddress(res.data.walletAddress || '');
      } catch (err) {
        console.error("Failed to fetch wallet:", err);
      }
    };

    if (token) fetchWallet();
  }, [token]);

  const handleSave = async () => {
    if (!walletAddress.trim()) {
      setMessage('Please enter a valid wallet address.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post('https://api.atfomo.com/api/wallet',
        { walletAddress },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setMessage(`Wallet address saved: ${res.data.walletAddress}`);
    } catch (err) {
      console.error('Save error:', err);
      setMessage('Failed to save wallet address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Set Wallet Address</h3>
      <input
        type="text"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        placeholder="Enter your wallet address"
        style={{ padding: '8px', width: '300px' }}
      />
      <button onClick={handleSave} disabled={loading} style={{ marginLeft: '10px', padding: '8px' }}>
        {loading ? 'Saving...' : 'Save'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default WalletAddressForm;
