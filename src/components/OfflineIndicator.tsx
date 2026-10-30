import React, { useEffect } from 'react';
import { syncPendingOfflineVotes } from '../services/pollService';

export const OfflineIndicator: React.FC = () => {
  // Silent background sync only - NO UI banners per user instruction ("ye sync Wala na laguo Kuch")
  useEffect(() => {
    const handleSync = async () => {
      try {
        await syncPendingOfflineVotes();
      } catch {}
    };

    handleSync();

    const handleOnline = () => {
      handleSync();
    };

    window.addEventListener('online', handleOnline);
    const interval = setInterval(handleSync, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  return null;
};

