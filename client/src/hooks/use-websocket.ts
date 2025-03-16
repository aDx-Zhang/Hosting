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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // Clear any existing socket
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      socket.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempt.current = 0;

        toast({
          title: 'Connected',
          description: 'Real-time updates are now active',
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connection_established') {
            setIsConnected(true);
          } else {
            onMessage?.(data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        socket.current = null;

        if (reconnectAttempt.current < maxReconnectAttempts) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
          reconnectAttempt.current++;

          console.log(`Attempting reconnect in ${backoffTime}ms (attempt ${reconnectAttempt.current})`);

          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(connect, backoffTime);

          if (reconnectAttempt.current === 1) {
            toast({
              title: 'Connection Lost',
              description: 'Attempting to reconnect...',
              variant: 'destructive',
            });
          }
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
    };
  }, [connect]);

  return { isConnected, socket: socket.current };
}