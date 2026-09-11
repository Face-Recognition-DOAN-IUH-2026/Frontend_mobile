import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_NO_PATH } from '../config/api';
import { devError } from '../utils/logger';

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
    let controller: AbortController | null = null;

    const check = async () => {
      if (controller) return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8000);
      try {
        const res = await fetch(`${API_BASE_NO_PATH}/healthz`, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
        if (mounted) setNetworkState({ isOnline: res.ok, isConnected: true });
} catch (err) {
      devError('[Network] Health check failed:', err);
      if (mounted) setNetworkState({ isOnline: false, isConnected: false });
    } finally {
      clearTimeout(timeout);
      controller = null;
    }
    };

    check();
    const interval = setInterval(check, 15000);

    return () => { mounted = false; clearInterval(interval); controller?.abort(); };
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
};
