import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export function ConnectionStatus({ isConnected, isConnecting }: ConnectionStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-[#241b35]/50 border-purple-700/30 backdrop-blur-sm hover:bg-[#241b35] transition-colors">
        <CardContent className="p-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
            isConnecting ? "text-primary" :
              isConnected ? "text-green-500" : "text-destructive"
          )}>
            {isConnecting ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </motion.div>
                <span className="text-sm font-medium text-primary/80">
                  Connecting to real-time updates...
                </span>
              </>
            ) : isConnected ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </motion.div>
                <span className="text-sm font-medium">
                  Connected to real-time updates
                </span>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <AlertTriangle className="h-4 w-4" />
                </motion.div>
                <span className="text-sm font-medium">
                  Connection lost. Reconnecting...
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}