import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketHookOptions {
  onMessage?: (data: unknown) => void;
}

export function useWebSocket({ onMessage }: WebSocketHookOptions = {}) {
  const socket = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    socket.current = new WebSocket(wsUrl);

    socket.current.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempt.current = 0; // Reset reconnect attempts on successful connection
    };

    socket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    socket.current.onerror = () => {
      if (reconnectAttempt.current === 0) {
        toast({
          title: 'Connection Error',
          description: 'Having trouble connecting to real-time updates. Retrying...',
          variant: 'destructive',
        });
      }
    };

    socket.current.onclose = () => {
      const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
      reconnectAttempt.current++;

      console.log(`WebSocket disconnected. Reconnecting in ${backoffTime}ms...`);
      setTimeout(connect, backoffTime);
    };
  }, [onMessage, toast]);

  useEffect(() => {
    connect();

    return () => {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
    };
  }, [connect]);

  return socket.current;
}