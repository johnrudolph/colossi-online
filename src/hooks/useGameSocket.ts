import { useEffect, useRef, useState, useCallback } from "react";
import {
  GameState,
  GameAction,
  CreateGameRequest,
  JoinGameRequest,
} from "../shared/types/game";

interface UseGameSocketReturn {
  socket: null;
  gameState: GameState | null;
  playerId: string | null;
  isConnected: boolean;
  createGame: (data: CreateGameRequest) => Promise<{
    success: boolean;
    gameId?: string;
    error?: { code: string; message: string };
  }>;
  joinGame: (
    data: JoinGameRequest,
  ) => Promise<{ success: boolean; error?: { code: string; message: string } }>;
  leaveGame: () => void;
  sendAction: (action: Omit<GameAction, "playerId">) => void;
  error: string | null;
  testAPI: () => Promise<unknown>;
}

interface GameSocketEvents {
  onGameUpdated?: (gameState: GameState) => void;
  onPlayerJoined?: (data: { player: unknown }) => void;
  onPlayerLeft?: (data: { player: unknown }) => void;
  onPhaseChanged?: (data: { phase: string; gameState: unknown }) => void;
  onCardPrepared?: (data: {
    playerId: string;
    card: unknown;
    environmentId: string;
  }) => void;
  onSkirmishInitiated?: (data: {
    environmentId: string;
    initiatorId: string;
    gameState: unknown;
  }) => void;
  onCardPlayed?: (data: {
    playerId: string;
    card: unknown;
    environmentId: string;
  }) => void;
  onItemTaken?: (data: {
    playerId: string;
    item: unknown;
    environmentId: string;
  }) => void;
  onPlayerPassed?: (data: { playerId: string }) => void;
  onSkirmishEnded?: (data: {
    environmentId: string;
    scores: unknown[];
    winner: unknown;
  }) => void;
  onGameEnded?: (data: { winner: unknown; finalScores: unknown[] }) => void;
  onError?: (error: { code: string; message: string }) => void;
}

export function useGameSocket(events?: GameSocketEvents): UseGameSocketReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Always "connected" for HTTP
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Store IDs in localStorage for persistence
  useEffect(() => {
    const storedPlayerId = localStorage.getItem("colossi_player_id");
    const storedGameId = localStorage.getItem("colossi_game_id");

    if (storedPlayerId) setPlayerId(storedPlayerId);
    if (storedGameId) {
      setGameId(storedGameId);
      // Try to reconnect to existing game
      pollGameState(storedGameId);
    }
  }, []);

  // Poll for game state updates
  const pollGameState = useCallback(
    async (currentGameId: string) => {
      if (!currentGameId) return;

      try {
        const response = await fetch(`/api/game?gameId=${currentGameId}`);
        const result = await response.json();

        if (result.success && result.data.gameState) {
          const newGameState = result.data.gameState;

          // Check if state actually changed to trigger events
          if (JSON.stringify(newGameState) !== JSON.stringify(gameState)) {
            setGameState(newGameState);
            eventsRef.current?.onGameUpdated?.(newGameState);
          }
        }
      } catch (err) {
        console.error("Error polling game state:", err);
        setError("Connection error - retrying...");
      }
    },
    [gameState],
  );

  // Start/stop polling
  useEffect(() => {
    if (gameId && gameState) {
      // Poll every 2 seconds for updates
      const interval = setInterval(() => {
        pollGameState(gameId);
      }, 2000);

      setPollingInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [gameId, gameState, pollGameState]);

  // API helper function
  const apiCall = async (endpoint: string, data: unknown) => {
    console.log("Making API call:", { endpoint, data });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("API response:", result);

      return result;
    } catch (err) {
      console.error("API call failed:", err);
      return {
        success: false,
        error: { code: "NETWORK_ERROR", message: "Network error" },
      };
    }
  };

  // Create game function
  const createGame = useCallback(
    async (
      data: CreateGameRequest,
    ): Promise<{
      success: boolean;
      gameId?: string;
      error?: { code: string; message: string };
    }> => {
      console.log("Creating game with data:", data);
      setError(null);

      const result = await apiCall("/api/game", {
        action: "CREATE_GAME",
        ...data,
      });

      if (result.success) {
        const newPlayerId = result.data.playerId;
        const newGameId = result.data.gameId;
        const newGameState = result.data.gameState;

        setPlayerId(newPlayerId);
        setGameId(newGameId);
        setGameState(newGameState);

        // Store for persistence
        localStorage.setItem("colossi_player_id", newPlayerId);
        localStorage.setItem("colossi_game_id", newGameId);

        console.log("Game created successfully:", newGameId);
        eventsRef.current?.onGameUpdated?.(newGameState);

        return { success: true, gameId: newGameId };
      } else {
        setError(result.error?.message || "Failed to create game");
        return result;
      }
    },
    [],
  );

  // Join game function
  const joinGame = useCallback(
    async (
      data: JoinGameRequest,
    ): Promise<{
      success: boolean;
      error?: { code: string; message: string };
    }> => {
      setError(null);

      const result = await apiCall("/api/game", {
        action: "JOIN_GAME",
        ...data,
      });

      if (result.success) {
        const newPlayerId = result.data.playerId;
        const newGameId = result.data.gameId;
        const newGameState = result.data.gameState;

        setPlayerId(newPlayerId);
        setGameId(newGameId);
        setGameState(newGameState);

        // Store for persistence
        localStorage.setItem("colossi_player_id", newPlayerId);
        localStorage.setItem("colossi_game_id", newGameId);

        console.log("Joined game successfully:", newGameId);
        eventsRef.current?.onGameUpdated?.(newGameState);

        return { success: true };
      } else {
        setError(result.error?.message || "Failed to join game");
        return result;
      }
    },
    [],
  );

  // Leave game function
  const leaveGame = useCallback(async () => {
    if (!gameId || !playerId) return;

    await apiCall("/api/game", {
      action: "LEAVE_GAME",
      gameId,
      playerId,
    });

    // Clear state
    setGameState(null);
    setPlayerId(null);
    setGameId(null);
    setError(null);

    // Clear storage
    localStorage.removeItem("colossi_player_id");
    localStorage.removeItem("colossi_game_id");

    // Stop polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    console.log("Left game");
  }, [gameId, playerId, pollingInterval]);

  // Send game action
  const sendAction = useCallback(
    async (action: Omit<GameAction, "playerId">) => {
      console.log("Sending action:", action);

      if (!gameId || !playerId) {
        console.error("Missing gameId or playerId:", { gameId, playerId });
        setError("Not in a game");
        return;
      }

      setError(null);

      const actionPayload = {
        action: "GAME_ACTION",
        gameId,
        playerId,
        gameAction: {
          ...action,
        },
      };

      console.log("Action payload:", actionPayload);

      const result = await apiCall("/api/game", actionPayload);

      console.log("Action result:", result);

      if (result.success) {
        const newGameState = result.data.gameState;
        setGameState(newGameState);
        eventsRef.current?.onGameUpdated?.(newGameState);
        console.log("Action processed successfully:", action.type);
      } else {
        const errorMessage = result.error?.message || "Action failed";
        setError(errorMessage);
        console.error("Action failed:", result.error || result);
      }
    },
    [gameId, playerId],
  );

  // Test API connectivity
  const testAPI = useCallback(async () => {
    console.log("Testing API connectivity...");
    try {
      const response = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data", timestamp: Date.now() }),
      });
      const result = await response.json();
      console.log("API test result:", result);
      return result;
    } catch (err) {
      console.error("API test failed:", err);
      return { success: false, error: err };
    }
  }, []);

  return {
    socket: null, // No socket needed for HTTP-based approach
    gameState,
    playerId,
    isConnected,
    createGame,
    joinGame,
    leaveGame,
    sendAction,
    error,
    testAPI, // Add test function for debugging
  };
}

// Additional hook for specific game actions
export function useGameActions(
  sendAction: (action: Omit<GameAction, "playerId">) => void,
) {
  const readyUp = useCallback(() => {
    sendAction({ type: "READY_UP" });
  }, [sendAction]);

  const prepareCard = useCallback(
    (cardId: string, environmentId: string) => {
      sendAction({
        type: "PREPARE_CARD",
        payload: { cardId, environmentId },
      });
    },
    [sendAction],
  );

  const initiateSkirmish = useCallback(
    (environmentId: string) => {
      sendAction({
        type: "INITIATE_SKIRMISH",
        payload: { environmentId },
      });
    },
    [sendAction],
  );

  const playCard = useCallback(
    (cardId: string) => {
      sendAction({
        type: "PLAY_CARD",
        payload: { cardId },
      });
    },
    [sendAction],
  );

  const takeItem = useCallback(
    (itemId: string, discardedCardIds?: string[]) => {
      sendAction({
        type: "TAKE_ITEM",
        payload: { itemId, discardedCardIds },
      });
    },
    [sendAction],
  );

  const pass = useCallback(
    (environmentDistribution?: { [environmentId: string]: string[] }) => {
      sendAction({
        type: "PASS",
        payload: { environmentDistribution },
      });
    },
    [sendAction],
  );

  const discardToHandLimit = useCallback(
    (discardedCardIds: string[]) => {
      sendAction({
        type: "DISCARD_TO_HAND_LIMIT",
        payload: { discardedCardIds },
      });
    },
    [sendAction],
  );

  return {
    readyUp,
    prepareCard,
    initiateSkirmish,
    playCard,
    takeItem,
    pass,
    discardToHandLimit,
  };
}
