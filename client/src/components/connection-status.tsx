import { Loader2 } from "lucide-react";
import { AnimatedEmoji } from "./animated-emoji";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export function ConnectionStatus({ isConnected, isConnecting }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2">
        <AnimatedEmoji state="connecting" className="text-lg" />
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center">
        <AnimatedEmoji state="disconnected" className="text-lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <AnimatedEmoji state="connected" className="text-lg" />
    </div>
  );
}