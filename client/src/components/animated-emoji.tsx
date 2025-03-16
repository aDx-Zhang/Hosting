import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface AnimatedEmojiProps {
  state: 'connected' | 'connecting' | 'disconnected';
  className?: string;
}

export function AnimatedEmoji({ state, className }: AnimatedEmojiProps) {
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    setBounce(true);
    const timer = setTimeout(() => setBounce(false), 500);
    return () => clearTimeout(timer);
  }, [state]);

  const emoji = {
    connected: "🟢",
    connecting: "🟡",
    disconnected: "🔴"
  }[state];

  return (
    <span 
      className={cn(
        "inline-block transition-transform duration-500",
        bounce && "animate-bounce",
        className
      )}
    >
      {emoji}
    </span>
  );
}
