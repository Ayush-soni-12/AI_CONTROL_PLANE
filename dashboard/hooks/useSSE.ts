'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Connection status for SSE streams
 */
export type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * SSE Hook return type
 */
export interface SSEResult<T> {
  data: T | null;
  status: SSEStatus;
  error: string | null;
  reconnect: () => void;
}

/**
 * Generic hook for Server-Sent Events (SSE) connections
 * 
 * Provides automatic connection management, reconnection, and type-safe data handling.
 * Replaces polling-based data fetching with efficient server-push architecture.
 * 
 * @param url - SSE endpoint URL (e.g., '/api/sse/signals')
 * @param eventType - Event type to listen for (e.g., 'signals', 'services')
 * @param enabled - Whether to establish the connection (default: true)
 * @returns SSE connection state and data
 * 
 * @example
 * ```tsx
 * const { data, status, error } = useSSE<SignalData[]>('/api/sse/signals', 'signals');
 * 
 * if (status === 'connecting') return <div>Connecting...</div>;
 * if (status === 'error') return <div>Error: {error}</div>;
 * if (!data) return <div>No data</div>;
 * 
 * return <div>{data.map(...)}</div>;
 * ```
 */
export function useSSE<T>(
  url: string,
  eventType: string,
  enabled: boolean = true
): SSEResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<SSEStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const maxReconnectDelay = 30000; // 30 seconds max
  const baseDelay = 1000; // 1 second base delay
  const maxRetries = 10;

  // Function to establish SSE connection
  const connect = () => {
    if (!enabled) return;

    try {
      setStatus('connecting');
      setError(null);

      // Create EventSource connection
      const eventSource = new EventSource(`http://localhost:8000${url}`, {
        withCredentials: true, // Include cookies for authentication
      });

      // Handle connection open
      eventSource.onopen = () => {
        console.log(`✅ SSE connected: ${url}`);
        setStatus('connected');
        reconnectAttemptRef.current = 0; // Reset reconnect attempts
      };

      // Handle incoming events
      eventSource.addEventListener(eventType, (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          setStatus('connected');
        } catch (err) {
          console.error(`❌ Failed to parse SSE data for ${eventType}:`, err);
          setError('Failed to parse server data');
        }
      });

      // Handle errors (connection lost, server error, etc.)
      eventSource.onerror = (err) => {
        console.error(`❌ SSE error on ${url}:`, err);
        setStatus('error');
        setError('Connection lost. Reconnecting...');

        // Close the connection
        eventSource.close();

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptRef.current < maxRetries) {
          const delay = Math.min(
            baseDelay * Math.pow(2, reconnectAttemptRef.current),
            maxReconnectDelay
          );

          console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxRetries})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1;
            connect();
          }, delay);
        } else {
          setStatus('disconnected');
          setError('Failed to connect after multiple attempts. Please refresh the page.');
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error(`❌ Failed to create SSE connection to ${url}:`, err);
      setStatus('error');
      setError('Failed to establish connection');
    }
  };

  // Manual reconnect function
  const reconnect = () => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset reconnect attempts and connect
    reconnectAttemptRef.current = 0;
    connect();
  };

  // Establish connection on mount or when URL/enabled changes
  useEffect(() => {
    if (enabled) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        console.log(`🔌 Closing SSE connection: ${url}`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [url, eventType, enabled]);

  return { data, status, error, reconnect };
}
