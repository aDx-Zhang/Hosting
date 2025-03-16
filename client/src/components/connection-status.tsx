import { Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export function ConnectionStatus({ isConnected, isConnecting }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 min-w-[90px] justify-end">
        <span className="text-xs font-medium text-yellow-500/90">reconnecting</span>
        <Loader2 className="h-3 w-3 animate-spin text-yellow-500/90" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-end min-w-[90px]">
        <span className="text-xs font-medium text-destructive/90">disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end min-w-[90px]">
      <span className="text-xs font-medium text-emerald-500/90">connected</span>
    </div>
  );
}