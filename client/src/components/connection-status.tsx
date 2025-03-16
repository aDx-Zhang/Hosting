import { Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export function ConnectionStatus({ isConnected, isConnecting }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-yellow-500">reconnecting</span>
        <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center">
        <span className="text-sm text-red-500">disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <span className="text-sm text-green-500">connected</span>
    </div>
  );
}