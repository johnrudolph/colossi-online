"use client";

import { useState, useEffect, useCallback } from "react";
import { GameState, PlayerCard, Item } from "../shared/types/game";
import {
  getPlayerCardImagePath,
  getEnvironmentImagePath,
  getItemImagePath,
  getCardTypeIcon,
} from "../shared/utils/cards";
import Image from "next/image";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [joinGameId, setJoinGameId] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<PlayerCard | null>(null);
  const [dragOverEnvironment, setDragOverEnvironment] = useState<string | null>(
    null,
  );

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // API helper
  const apiCall = async (endpoint: string, data: unknown) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (err) {
      console.error("API call failed:", err);
      return {
        success: false,
        error: { code: "NETWORK_ERROR", message: "Network error" },
      };
    }
  };

  // Poll for game state updates
  const pollGameState = useCallback(
    async (currentGameId: string) => {
      if (!currentGameId) return;

      try {
        const response = await fetch(`/api/game?gameId=${currentGameId}`);
        const result = await response.json();

        if (result.success && result.data.gameState) {
          const newGameState = result.data.gameState;

          // Always update game state if it changed
          if (JSON.stringify(newGameState) !== JSON.stringify(gameState)) {
            setGameState(newGameState);
            console.log("Game state updated from server");
          }

          // If we don't have a playerId but have one stored, restore it
          if (!playerId) {
            const storedPlayerId = localStorage.getItem("colossi_player_id");
            if (storedPlayerId) {
              setPlayerId(storedPlayerId);
              console.log(
                "Restored player ID from localStorage:",
                storedPlayerId,
              );
            }
          }

          // Clear any connection errors since we successfully got data
          if (error && error.includes("Game no longer exists")) {
            setError(null);
          }
        } else if (result.error?.code === "GAME_NOT_FOUND") {
          // Game no longer exists, clear stored data
          console.log("Game not found, clearing stored data");
          localStorage.removeItem("colossi_player_id");
          localStorage.removeItem("colossi_game_id");
          setGameId("");
          setPlayerId(null);
          setGameState(null);
          setError("Game no longer exists");
        }
      } catch (err) {
        console.error("Error polling game state:", err);
        setError("Connection error - retrying...");
      }
    },
    [gameState, playerId, error],
  );

  // Reconnection logic - restore game state from localStorage on page load
  useEffect(() => {
    const storedPlayerId = localStorage.getItem("colossi_player_id");
    const storedGameId = localStorage.getItem("colossi_game_id");

    if (storedPlayerId && storedGameId && !gameState && !activeGameId) {
      console.log("Attempting to reconnect to game:", storedGameId);
      setPlayerId(storedPlayerId);
      setActiveGameId(storedGameId);
      setError("Reconnecting to game...");

      // Try to fetch the current game state immediately
      setTimeout(() => {
        pollGameState(storedGameId);
      }, 100);
    }
  }, [pollGameState]);

  // Start polling when in a game
  useEffect(() => {
    if (activeGameId && gameState) {
      const interval = setInterval(() => {
        pollGameState(activeGameId);
      }, 2000);

      setPollingInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (activeGameId && !gameState) {
      // If we have an activeGameId but no gameState, try to fetch it
      pollGameState(activeGameId);
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [activeGameId, gameState, pollGameState]);

  // Create game
  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall("/api/game", {
        action: "CREATE_GAME",
        playerName: playerName.trim(),
        maxPlayers: 4,
        isQuickGame: false,
      });

      if (result.success) {
        const newGameId = result.data.gameId;
        const newPlayerId = result.data.playerId;

        setActiveGameId(newGameId);
        setPlayerId(newPlayerId);
        setGameState(result.data.gameState);
        setError(null);
        setCopySuccess(`✅ Game created! Game ID: ${newGameId}`);

        // Store for persistence
        localStorage.setItem("colossi_player_id", newPlayerId);
        localStorage.setItem("colossi_game_id", newGameId);

        console.log("Game created successfully:", newGameId);
      } else {
        setError(
          `Failed to create game: ${result.error?.message || "Unknown error"}`,
        );
      }
    } catch (err) {
      setError(
        `Network Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Join game
  const handleJoinGame = async () => {
    if (!playerName.trim() || !joinGameId.trim()) {
      setError("Please enter your name and game ID");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall("/api/game", {
        action: "JOIN_GAME",
        gameId: joinGameId.trim(),
        playerName: playerName.trim(),
      });

      if (result.success) {
        const newPlayerId = result.data.playerId;
        const joinedGameId = result.data.gameId;

        setPlayerId(newPlayerId);
        setActiveGameId(joinedGameId);
        setGameState(result.data.gameState);
        setError(null);
        setJoinGameId(""); // Clear the form

        // Store for persistence
        localStorage.setItem("colossi_player_id", newPlayerId);
        localStorage.setItem("colossi_game_id", joinedGameId);

        console.log("Joined game successfully:", joinedGameId);
      } else {
        setError(
          `Failed to join game: ${result.error?.message || "Unknown error"}`,
        );
      }
    } catch (err) {
      setError(
        `Network Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Leave game
  const handleLeaveGame = async () => {
    if (!activeGameId || !playerId) return;

    await apiCall("/api/game", {
      action: "LEAVE_GAME",
      gameId: activeGameId,
      playerId,
    });

    setGameState(null);
    setPlayerId(null);
    setActiveGameId(null);
    setJoinGameId("");
    setError(null);

    // Clear localStorage
    localStorage.removeItem("colossi_player_id");
    localStorage.removeItem("colossi_game_id");

    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // Copy game ID to clipboard
  const copyGameId = async () => {
    if (!activeGameId) return;

    try {
      await navigator.clipboard.writeText(activeGameId);
      setCopySuccess("✅ Game ID copied to clipboard!");
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  // Send game action
  const sendGameAction = async (actionType: string, payload?: any) => {
    if (!activeGameId || !playerId) return;

    setError(null);

    const result = await apiCall("/api/game", {
      action: "GAME_ACTION",
      gameId: activeGameId,
      playerId,
      gameAction: {
        type: actionType,
        ...payload,
      },
    });

    if (result.success) {
      setGameState(result.data.gameState);
    } else {
      setError(result.error?.message || "Action failed");
    }
  };

  // Ready up action
  const handleReadyUp = () => {
    sendGameAction("READY_UP");
  };

  // Prepare card action
  const handlePrepareCard = (cardId: string, environmentId: string) => {
    sendGameAction("PREPARE_CARD", {
      cardId,
      environmentId,
    });
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, card: PlayerCard) => {
    setDraggedCard(card);
    e.dataTransfer.setData("text/plain", card.id);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverEnvironment(null);
  };

  const handleDragOver = (e: React.DragEvent, environmentId: string) => {
    e.preventDefault();
    setDragOverEnvironment(environmentId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverEnvironment(null);
  };

  const handleDrop = (e: React.DragEvent, environmentId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");

    if (
      cardId &&
      draggedCard &&
      gameState?.phase === "handbuilding" &&
      isMyTurn()
    ) {
      handlePrepareCard(cardId, environmentId);
    }

    setDraggedCard(null);
    setDragOverEnvironment(null);
  };

  // Get current player
  const getCurrentPlayer = () => {
    if (!gameState || !playerId) return null;
    return gameState.players.find((p) => p.id === playerId);
  };

  // Check if it's my turn
  const isMyTurn = () => {
    if (!gameState || !playerId) return false;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer?.id === playerId;
  };

  // Render a card
  const renderCard = (
    card: PlayerCard,
    onClick?: () => void,
    isInHand?: boolean,
    showFaceDown?: boolean,
  ) => (
    <div
      key={card.id}
      className={`
        ${isInHand ? "w-24 h-36" : "w-20 h-28"} bg-white border-2 border-gray-300 rounded-lg
        overflow-hidden transition-all duration-200
        ${isInHand && gameState?.phase === "handbuilding" && isMyTurn() ? "cursor-grab hover:cursor-grabbing" : "cursor-pointer"}
        ${onClick ? "hover:shadow-lg hover:scale-105" : ""}
        ${isInHand ? "hover:transform hover:-translate-y-2" : ""}
        ${draggedCard?.id === card.id ? "opacity-50 scale-95" : ""}
      `}
      draggable={isInHand && gameState?.phase === "handbuilding" && isMyTurn()}
      onDragStart={(e) => isInHand && handleDragStart(e, card)}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      title={
        showFaceDown
          ? "Face-down prepared card"
          : `${card.title} (${card.type}) - ${card.effect}`
      }
    >
      {showFaceDown ? (
        <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-2xl mb-1">🎴</div>
            <div className="text-xs font-bold">PREPARED</div>
          </div>
        </div>
      ) : (
        <Image
          src={getPlayerCardImagePath(card)}
          alt={card.title}
          width={isInHand ? 96 : 80}
          height={isInHand ? 144 : 112}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to icon display if image fails to load
            const target = e.target as HTMLElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center text-xs font-bold p-1">
                  <div class="text-lg mb-1">${getCardTypeIcon(card.type)}</div>
                  <div class="text-center">
                    <div class="font-semibold text-xs">${card.title}</div>
                    <div class="text-xs text-blue-600">${typeof card.power === "number" ? card.power : "?"} PWR</div>
                  </div>
                </div>
              `;
            }
          }}
        />
      )}
    </div>
  );

  // If not in a game, show lobby
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Colossi Online
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {copySuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {copySuccess}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />

            <div className="border-t pt-4">
              <button
                onClick={handleCreateGame}
                disabled={!playerName.trim() || isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                {isLoading ? "Creating..." : "🎮 Create New Game"}
              </button>

              <div className="text-center my-2">
                <span className="text-gray-500">or</span>
              </div>

              {!showJoinForm ? (
                <button
                  onClick={() => setShowJoinForm(true)}
                  disabled={isLoading}
                  className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                  🚪 Join Existing Game
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter game ID"
                    value={joinGameId}
                    onChange={(e) => setJoinGameId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleJoinGame}
                      disabled={
                        !playerName.trim() || !joinGameId.trim() || isLoading
                      }
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                      {isLoading ? "Joining..." : "Join"}
                    </button>
                    <button
                      onClick={() => setShowJoinForm(false)}
                      disabled={isLoading}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-500 text-center">
            <p>🎯 Built with Next.js and TypeScript</p>
            <p>📡 Server running on localhost:3001</p>
            <p>🐛 Check browser console for detailed logs</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer();

  // In a game - show game interface
  return (
    <div className="min-h-screen bg-green-800 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Colossi Online</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Game ID:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                  {activeGameId}
                </code>
                <button
                  onClick={copyGameId}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                  title="Copy Game ID"
                >
                  <span>📋</span>
                  <span>Copy</span>
                </button>
              </div>
              <button
                onClick={handleLeaveGame}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Leave Game
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {copySuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {copySuccess}
            </div>
          )}

          {/* Game Status */}
          <div className="flex justify-between items-center text-sm">
            <span>
              Phase: <strong className="capitalize">{gameState.phase}</strong>
            </span>
            <span>
              Turn: <strong>{gameState.turn}</strong>
            </span>
            <span>
              Players:{" "}
              <strong>
                {gameState.players.length}/{gameState.maxPlayers}
              </strong>
            </span>
            <span>
              Target: <strong>{gameState.targetSkirmishes} skirmishes</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Players Status */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-3">Players</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={`
                  p-3 rounded border-2
                  ${index === gameState.currentPlayerIndex ? "border-blue-500 bg-blue-50" : "border-gray-200"}
                  ${player.id === playerId ? "bg-yellow-50" : ""}
                `}
              >
                <div className="font-semibold">{player.name}</div>
                <div className="text-sm text-gray-600">
                  Color: {player.color}
                </div>
                <div className="text-sm">
                  Hand: {player.hand.length} | Deck: {player.deck.length}
                </div>
                <div className="text-sm">
                  Skirmishes won: <strong>{player.skirmishesWon}</strong>
                </div>
                <div className="text-sm">
                  {player.isReady ? "✅ Ready" : "⏳ Not Ready"}
                  {!player.isConnected && " (Disconnected)"}
                  {player.id === playerId && " (You)"}
                  {player.hasPassed && " (Passed)"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Phase */}
      {gameState.phase === "setup" && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="mb-4">Waiting for all players to be ready...</p>
            {currentPlayer && !currentPlayer.isReady && (
              <button
                onClick={handleReadyUp}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded"
              >
                Ready Up!
              </button>
            )}
          </div>
        </div>
      )}

      {/* Environments */}
      {(gameState.phase === "handbuilding" ||
        gameState.phase === "skirmish") && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4">Environments</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gameState.environmentStates.map((envState) => (
                <div
                  key={envState.environment.id}
                  className={`
                    bg-white rounded-lg overflow-hidden border-2 shadow-md transition-all duration-200
                    ${dragOverEnvironment === envState.environment.id ? "border-blue-500 border-4 bg-blue-50" : "border-green-300"}
                    ${gameState.phase === "handbuilding" && isMyTurn() ? "hover:border-green-500" : ""}
                  `}
                  onDragOver={(e) => handleDragOver(e, envState.environment.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, envState.environment.id)}
                >
                  {/* Environment Card Image */}
                  <div className="relative h-48 mb-2">
                    <Image
                      src={getEnvironmentImagePath(envState.environment.title)}
                      alt={envState.environment.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        // Fallback display if image fails to load
                        const target = e.target as HTMLElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full bg-green-100 flex items-center justify-center">
                              <div class="text-center">
                                <div class="text-2xl mb-2">🏞️</div>
                                <div class="font-bold">${envState.environment.title}</div>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                  <div className="p-3">
                    {/* Items */}
                    {envState.items.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-sm mb-1">Items:</h4>
                        <div className="flex gap-2 flex-wrap">
                          {envState.items.map((item: Item) => (
                            <div
                              key={item.id}
                              className="bg-white border-2 border-yellow-400 rounded-lg overflow-hidden cursor-pointer hover:border-yellow-600 transition-colors"
                              style={{ width: "60px", height: "84px" }}
                              title={`${item.title} - ${item.description} (Cost: ${item.discard_cost})`}
                            >
                              <Image
                                src={getItemImagePath(item.title)}
                                alt={item.title}
                                width={60}
                                height={84}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLElement;
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full bg-yellow-200 flex flex-col items-center justify-center text-xs p-1">
                                        <div class="font-semibold text-center">${item.title}</div>
                                        <div class="text-center">Cost: ${item.discard_cost}</div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prepared cards display */}
                    <div className="mb-3">
                      <div className="text-sm font-semibold mb-2">
                        Prepared cards (
                        {Object.values(
                          gameState.preparedCards[envState.environment.id] ||
                            {},
                        ).reduce((sum, cards) => sum + cards.length, 0)}
                        ):
                      </div>

                      {/* Show prepared cards by player */}
                      {Object.entries(
                        gameState.preparedCards[envState.environment.id] || {},
                      ).map(([pId, cards]: [string, PlayerCard[]]) => {
                        if (cards.length === 0) return null;
                        const player = gameState.players.find(
                          (p) => p.id === pId,
                        );
                        return (
                          <div key={pId} className="mb-2">
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              {player?.name}: {cards.length} card
                              {cards.length > 1 ? "s" : ""}
                            </div>
                            <div className="flex gap-1">
                              {cards.map((card, index) => (
                                <div key={`${card.id}-${index}`}>
                                  {renderCard(card, undefined, false, true)}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {gameState.phase === "handbuilding" && isMyTurn() && (
                        <div className="text-xs text-blue-600 italic mt-2">
                          Drag cards here to prepare them
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Player's Hand */}
      {currentPlayer &&
        (gameState.phase === "handbuilding" ||
          gameState.phase === "skirmish") && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">
                Your Hand ({currentPlayer.hand.length}/
                {gameState.phase === "handbuilding" ? "3" : "10"})
              </h2>

              <div className="flex flex-wrap gap-3 mb-4 justify-center">
                {currentPlayer.hand.map((card) =>
                  renderCard(
                    card,
                    () => {
                      console.log("Card clicked:", card.title);
                      // Click functionality can be added here if needed
                    },
                    true,
                    false,
                  ),
                )}
              </div>

              {/* Current turn indicator */}
              {gameState.phase === "handbuilding" ||
              gameState.phase === "skirmish" ? (
                isMyTurn() ? (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
                    <strong>Your Turn!</strong> -{" "}
                    {gameState.phase === "handbuilding"
                      ? "Prepare a card or initiate a skirmish"
                      : "Play a card, take an item, or pass"}
                  </div>
                ) : (
                  <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded">
                    Waiting for{" "}
                    {gameState.players[gameState.currentPlayerIndex]?.name}'s
                    turn...
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}

      {/* Game End */}
      {gameState.phase === "finished" && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <div className="space-y-2">
              {gameState.players
                .sort((a, b) => b.skirmishesWon - a.skirmishesWon)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-2 rounded ${index === 0 ? "bg-yellow-100 font-bold" : "bg-gray-100"}`}
                  >
                    {index + 1}. {player.name} - {player.skirmishesWon}{" "}
                    skirmishes won
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
