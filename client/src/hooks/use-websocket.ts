import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketHookOptions {
  onMessage?: (data: unknown) => void;
}

export function useWebSocket({ onMessage }: WebSocketHookOptions = {}) {
  const socket = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    // Don't try to reconnect if we're already connected or connecting
    if (socket.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);

      // Clean up existing socket if any
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
        setIsConnecting(false);
        reconnectAttempt.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connection_established') {
            setIsConnected(true);
            setIsConnecting(false);
          } else {
            onMessage?.(data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        socket.current = null;

        // Only attempt to reconnect if we haven't exceeded the maximum attempts
        if (reconnectAttempt.current < maxReconnectAttempts) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
          reconnectAttempt.current++;

          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          // Set up new reconnection attempt
          console.log(`Attempting reconnect in ${backoffTime}ms (attempt ${reconnectAttempt.current})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            // Double check we're still disconnected before attempting reconnect
            if (!isConnected && !isConnecting) {
              connect();
            }
          }, backoffTime);

          // Only show toast on first disconnect
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
      setIsConnecting(false);
    }
  }, [onMessage, toast, isConnected, isConnecting]);

  useEffect(() => {
    connect();

    return () => {
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Close existing socket connection
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }

      // Reset connection state
      setIsConnected(false);
      setIsConnecting(false);
      reconnectAttempt.current = 0;
    };
  }, [connect]);

  return { isConnected, isConnecting, socket: socket.current };
}