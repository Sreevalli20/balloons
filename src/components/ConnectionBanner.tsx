import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export const ConnectionBanner: React.FC = () => {
  const { connectionStatus, connectionError } = useAuth();

  if (connectionStatus === 'connected') {
    return null; // All good, no obstruction
  }

  if (connectionStatus === 'checking') {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          <span>Connecting to AnnaSetu database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold">Database Status: </span>
          <span>{connectionError || 'Unable to establish live connection to Supabase.'}</span>
        </div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-2.5 py-1 text-xs font-medium bg-amber-200 hover:bg-amber-300 rounded text-amber-900 transition-colors"
      >
        Retry
      </button>
    </div>
  );
};
