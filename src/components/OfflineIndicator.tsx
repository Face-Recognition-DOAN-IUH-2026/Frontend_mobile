import React from 'react';
import { Banner } from 'react-native-paper';
import { useNetwork } from '../context/NetworkContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <Banner
      visible={!isOnline}
      actions={[]}
      icon="wifi-off"
      style={{ backgroundColor: '#FF6B6B' }}
    >
      Offline - showing cached data
    </Banner>
  );
};
