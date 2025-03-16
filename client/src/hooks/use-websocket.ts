import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketHookOptions {
  onMessage?: (data: unknown) => void;
}

export function useWebSocket({ onMessage }: WebSocketHookOptions = {}) {
  const socket = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      socket.current = new WebSocket(wsUrl);

      socket.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempt.current = 0; // Reset reconnect attempts on successful connection

        // Clear any existing error toasts
        toast({
          title: 'Connected',
          description: 'Real-time updates are now active',
        });
      };

      socket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      socket.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        if (reconnectAttempt.current < maxReconnectAttempts) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
          reconnectAttempt.current++;

          if (reconnectAttempt.current === 1) {
            toast({
              title: 'Connection Lost',
              description: 'Attempting to reconnect...',
              variant: 'destructive',
            });
          }

          console.log(`Attempting reconnect in ${backoffTime}ms (attempt ${reconnectAttempt.current})`);
          setTimeout(connect, backoffTime);
        } else {
          toast({
            title: 'Connection Failed',
            description: 'Unable to establish connection. Please refresh the page.',
            variant: 'destructive',
          });
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
    }
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

  return { isConnected, socket: socket.current };
}