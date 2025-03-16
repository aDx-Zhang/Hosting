import { Loader2 } from "lucide-react";
import { AnimatedEmoji } from "./animated-emoji";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export function ConnectionStatus({ isConnected, isConnecting }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AnimatedEmoji state="connecting" className="text-lg" />
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting to real-time updates...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <AnimatedEmoji state="disconnected" className="text-lg" />
        <span>Connection lost. Attempting to reconnect...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-green-600">
      <AnimatedEmoji state="connected" className="text-lg" />
      <span>Connected to real-time updates</span>
    </div>
  );
}