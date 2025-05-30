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
    if (socket.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);

      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      socket.current = ws;

      ws.onopen = () => {
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
        setIsConnected(false);
        setIsConnecting(false);
        socket.current = null;

        if (reconnectAttempt.current < maxReconnectAttempts) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
          reconnectAttempt.current++;

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffTime);
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
      setIsConnected(false);
      setIsConnecting(false);
      reconnectAttempt.current = 0;
    };
  }, [connect]);

  return { isConnected, isConnecting };
}