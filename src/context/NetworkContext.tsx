import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';

interface NetworkContextType {
  isOnline: boolean;
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isConnected: true,
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetworkContextType>({
    isOnline: true,
    isConnected: true,
  });

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/../healthz`, { method: 'HEAD', cache: 'no-store' });
        if (mounted) setNetworkState({ isOnline: res.ok, isConnected: true });
      } catch {
        if (mounted) setNetworkState({ isOnline: false, isConnected: false });
      }
    };

    check();
    const interval = setInterval(check, 15000);

    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
};
