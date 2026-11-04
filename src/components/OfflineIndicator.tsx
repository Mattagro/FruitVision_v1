import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3500);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 px-3.5 py-2 text-xs font-semibold text-emerald-300 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span>Conexión restablecida</span>
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-950/90 border border-amber-500/40 px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
      </span>
      <WifiOff className="w-4 h-4 text-amber-400" />
      <span>Modo Terreno Offline (Sin internet)</span>
    </div>
  );
};
