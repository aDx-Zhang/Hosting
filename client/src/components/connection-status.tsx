import { Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export function ConnectionStatus({ isConnected, isConnecting }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-yellow-500/10 rounded-md">
        <span className="text-xs font-medium text-yellow-500">reconnecting</span>
        <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="px-2 py-1 bg-destructive/10 rounded-md">
        <span className="text-xs font-medium text-destructive">disconnected</span>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 bg-emerald-500/10 rounded-md">
      <span className="text-xs font-medium text-emerald-500">connected</span>
    </div>
  );
}