import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface LoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12"
};

export function LoadingIndicator({ size = "md" }: LoadingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center p-4"
    >
      <Loader2 className={`${sizes[size]} animate-spin text-primary`} />
    </motion.div>
  );
}
