import { useEffect, useRef, useState, useCallback } from "react";
import { Client, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// Types matching your backend
export interface WebSocketMessage<T = unknown> {
  type: string;
  action: string;
  payload: T;
  timestamp?: string;
}

export interface PaymentWebSocketPayload {
  userId: number;
  feeId: number;
  amount: number;
  orderCode: number;
  status: string;
  transactionCode: string;
  message: string;
}

export interface NotificationWebSocketPayload {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface ClubCreationWebSocketPayload {
  requestId: number;
  clubName: string;
  status: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
  assignedStaffEmail?: string;
  creatorId?: number;
  creatorName?: string;
  creatorEmail?: string;
  deadline?: string;
  reason?: string;
  comment?: string;
  message?: string;
  proposalId?: number;
  proposalTitle?: string;
  defenseScheduleId?: number;
  defenseDate?: string;
  defenseEndDate?: string;
  location?: string;
  meetingLink?: string;
  defenseResult?: string;
  feedback?: string;
  finalFormId?: number;
  finalFormTitle?: string;
  clubId?: number;
  clubCode?: string;
}

export interface EventWebSocketPayload {
  eventId?: number;
  eventTitle?: string;
  requestEventId?: number;
  status?: string;
  clubId?: number;
  clubName?: string;
  creatorId?: number;
  creatorName?: string;
  creatorEmail?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  eventTypeName?: string;
  responseMessage?: string;
  reason?: string;
  message?: string;
}

interface UseWebSocketOptions {
  url?: string;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  subscribe: (
    destination: string,
    callback: (message: WebSocketMessage<unknown>) => void
  ) => () => void;
  subscribeToUserQueue: (
    callback: (message: WebSocketMessage<unknown>) => void
  ) => () => void;
  subscribeToClub: (
    clubId: number,
    callback: (message: WebSocketMessage<unknown>) => void
  ) => () => void;
  subscribeToClubRole: (
    clubId: number,
    role: string,
    callback: (message: WebSocketMessage<unknown>) => void
  ) => () => void;
  subscribeToTeam: (
    teamId: number,
    callback: (message: WebSocketMessage<unknown>) => void
  ) => () => void;
  subscribeToSystemRole: (
    role: string,
    callback: (message: WebSocketMessage<unknown>) => void
  ) => () => void;
  subscribeToSystemWide: (
    callback: (message: WebSocketMessage<unknown>) => void
  ) => () => void;
  send: (destination: string, body: Record<string, unknown> | string) => void;
  disconnect: () => void;
}

export const useWebSocket = (
  token: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    url = import.meta.env.VITE_WEBSOCKET_URL || "http://localhost:8080/ws",
    reconnectDelay = 5000,
    heartbeatIncoming = 10000,
    heartbeatOutgoing = 10000,
  } = options;

  // runtime debug flag (not part of public props)
  const DEBUG = Boolean(import.meta.env.DEV);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<string, StompSubscription>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize and connect
  useEffect(() => {
    if (!token) {
      if (DEBUG)
        console.log("[WebSocket] No token provided, skipping connection");
      return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(url),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      // Do not expose STOMP debug via props; use runtime DEBUG flag
      debug: DEBUG ? (str) => console.log("[STOMP]", str) : () => {},
      reconnectDelay,
      heartbeatIncoming,
      heartbeatOutgoing,

      onConnect: () => {
        if (DEBUG) console.log("[WebSocket] Connected successfully");
        setIsConnected(true);
        setError(null);
      },

      onDisconnect: () => {
        if (DEBUG) console.log("[WebSocket] Disconnected");
        setIsConnected(false);
      },

      onStompError: (frame) => {
        const errorMsg = `WebSocket error: ${frame.headers?.message || "Unknown error"
          }`;
        console.error("[WebSocket]", errorMsg, frame.body);
        setError(errorMsg);
        setIsConnected(false);
      },

      onWebSocketError: (event) => {
        console.error("[WebSocket] WebSocket error:", event);
        setError("WebSocket connection error");
      },
    });

    clientRef.current = client;
    client.activate();

    // copy ref values to locals for stable cleanup
    const subs = subscriptionsRef.current;
    const timeoutHandle = reconnectTimeoutRef.current;

    return () => {
      if (DEBUG) console.log("[WebSocket] Cleaning up connection");
      subs.forEach((sub) => sub.unsubscribe());
      subs.clear();
      client.deactivate();
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    };
  }, [token, url, reconnectDelay, heartbeatIncoming, heartbeatOutgoing, DEBUG]);

  // Generic subscribe function
  const subscribe = useCallback(
    (
      destination: string,
      callback: (message: WebSocketMessage<unknown>) => void
    ) => {
      if (!clientRef.current?.connected) {
        console.warn("[WebSocket] Cannot subscribe, not connected");
        return () => { };
      }

      if (subscriptionsRef.current.has(destination)) {
        if (DEBUG)
          console.log("[WebSocket] Already subscribed to:", destination);
        return () => { };
      }

      const subscription = clientRef.current.subscribe(
        destination,
        (message) => {
          try {
            const parsedMessage = JSON.parse(
              message.body
            ) as WebSocketMessage<unknown>;
            if (DEBUG)
              console.log(
                "[WebSocket] Message received:",
                destination,
                parsedMessage
              );
            callback(parsedMessage);
          } catch (err) {
            console.error("[WebSocket] Failed to parse message:", err);
          }
        }
      );

      subscriptionsRef.current.set(destination, subscription);
      if (DEBUG) console.log("[WebSocket] Subscribed to:", destination);

      // Return unsubscribe function
      return () => {
        subscription.unsubscribe();
        subscriptionsRef.current.delete(destination);
        if (DEBUG) console.log("[WebSocket] Unsubscribed from:", destination);
      };
    },
    [DEBUG]
  );

  // Convenience methods for specific subscriptions
  const subscribeToUserQueue = useCallback(
    (callback: (message: WebSocketMessage<unknown>) => void) => {
      return subscribe("/user/queue/messages", callback);
    },
    [subscribe]
  );

  const subscribeToClub = useCallback(
    (
      clubId: number,
      callback: (message: WebSocketMessage<unknown>) => void
    ) => {
      return subscribe(`/topic/club/${clubId}`, callback);
    },
    [subscribe]
  );

  const subscribeToClubRole = useCallback(
    (
      clubId: number,
      role: string,
      callback: (message: WebSocketMessage<unknown>) => void
    ) => {
      return subscribe(`/topic/club/${clubId}/role/${role}`, callback);
    },
    [subscribe]
  );

  const subscribeToTeam = useCallback(
    (
      teamId: number,
      callback: (message: WebSocketMessage<unknown>) => void
    ) => {
      return subscribe(`/topic/team/${teamId}`, callback);
    },
    [subscribe]
  );

  const subscribeToSystemRole = useCallback(
    (role: string, callback: (message: WebSocketMessage<unknown>) => void) => {
      return subscribe(`/topic/system/role/${role}`, callback);
    },
    [subscribe]
  );

  const subscribeToSystemWide = useCallback(
    (callback: (message: WebSocketMessage<unknown>) => void) => {
      return subscribe("/topic/system/all", callback);
    },
    [subscribe]
  );

  // Send message
  const send = useCallback(
    (destination: string, body: Record<string, unknown> | string) => {
      if (!clientRef.current?.connected) {
        console.warn("[WebSocket] Cannot send message, not connected");
        return;
      }

      try {
        clientRef.current.publish({
          destination,
          body: typeof body === "string" ? body : JSON.stringify(body),
        });
        if (DEBUG) console.log("[WebSocket] Message sent to:", destination);
      } catch (err) {
        console.error("[WebSocket] Failed to send message:", err);
      }
    },
    [DEBUG]
  );

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      if (DEBUG) console.log("[WebSocket] Manually disconnected");
    }
  }, [DEBUG]);

  return {
    isConnected,
    error,
    subscribe,
    subscribeToUserQueue,
    subscribeToClub,
    subscribeToClubRole,
    subscribeToTeam,
    subscribeToSystemRole,
    subscribeToSystemWide,
    send,
    disconnect,
  };
};















