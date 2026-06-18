import { useState, useCallback, useEffect } from "react";
import useSocketStore from "./socketStore";
import { useAuthStore } from "@/features/core/auth/store";
import { SOCKET } from "./socketClient";

export const useSocket = () => {
  const { initialize, cleanup, listen, registerConsoleUser, socketStatus, reconnect } = useSocketStore();
  const { authData } = useAuthStore();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5; // Configurable max attempts

  // Initialize socket and register user
  const handleInitialSetup = useCallback(async () => {
    if (!authData) {
      return;
    }
    initialize();
    if (authData?.id) {
      registerConsoleUser(authData.id);
    }
  }, [initialize, authData?.id, registerConsoleUser]);

  // Monitor socket status and handle reconnection
  useEffect(() => {
    if (socketStatus === SOCKET.DISCONNECTED && reconnectAttempts < maxReconnectAttempts) {
      const timer = setTimeout(() => {
        reconnect(authData?.id || "");
        setReconnectAttempts((prev) => prev + 1);
      }, 2000 * (reconnectAttempts + 1)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [socketStatus, reconnectAttempts, reconnect]);

  // Reset reconnect attempts when connected
  useEffect(() => {
    if (socketStatus === SOCKET.CONNECTED || socketStatus === SOCKET.RECONNECTED) {
      setReconnectAttempts(0); // Reset attempts on successful connection
    }
  }, [socketStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    handleInitialSetup,
    socketStatus,
    listen,
    reconnect,
  };
};