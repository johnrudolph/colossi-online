import type { NextApiRequest, NextApiResponse } from "next";
import { GameEngine } from "../../shared/game/GameEngine";
import {
  GameAction,
  CreateGameRequest,
  JoinGameRequest,
} from "../../shared/types/game";

// In-memory storage for development (replace with Redis in production)
const games = new Map<string, GameEngine>();
const gamePlayers = new Map<string, string[]>(); // gameId -> playerIds[]
const playerGames = new Map<string, string>(); // playerId -> gameId

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string; details?: string };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  const { method } = req;

  console.log(`API ${method} request:`, req.body);

  try {
    switch (method) {
      case "POST":
        return await handlePost(req, res);
      case "GET":
        return await handleGet(req, res);
      default:
        res.setHeader("Allow", ["POST", "GET"]);
        res.status(405).json({
          success: false,
          error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
        });
    }
  } catch (error) {
    console.error("API error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : String(error),
      },
    });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  try {
    const { action } = req.body;
    console.log("POST action:", action);

    switch (action) {
      case "CREATE_GAME":
        return createGame(req, res);
      case "JOIN_GAME":
        return joinGame(req, res);
      case "LEAVE_GAME":
        return leaveGame(req, res);
      case "GAME_ACTION":
        return gameAction(req, res);
      case "GET_GAME_STATE":
        return getGameState(req, res);
      default:
        console.error("Invalid action received:", action);
        res.status(400).json({
          success: false,
          error: { code: "INVALID_ACTION", message: "Invalid action" },
        });
    }
  } catch (error) {
    console.error("Error in handlePost:", error);
    throw error;
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  const { gameId, playerId } = req.query;

  if (gameId && typeof gameId === "string") {
    const gameEngine = games.get(gameId);
    if (!gameEngine) {
      return res.status(404).json({
        success: false,
        error: { code: "GAME_NOT_FOUND", message: "Game not found" },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        gameState: gameEngine.getGameState(),
        playerId: playerId || null,
      },
    });
  }

  // List all active games
  const activeGames = Array.from(games.entries()).map(([id, engine]) => {
    const state = engine.getGameState();
    return {
      id,
      playerCount: state.players.length,
      maxPlayers: state.maxPlayers,
      phase: state.phase,
    };
  });

  res.status(200).json({
    success: true,
    data: { games: activeGames },
  });
}

async function createGame(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  const { playerName, maxPlayers, isQuickGame } = req.body as CreateGameRequest;

  if (!playerName) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "Player name is required" },
    });
  }

  // Create new game
  const gameEngine = new GameEngine(undefined, maxPlayers || 4, isQuickGame);
  const gameId = gameEngine.getGameState().id;

  // Generate unique player ID
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add creator as first player
  const error = gameEngine.addPlayer(playerId, playerName);
  if (error) {
    return res.status(400).json({
      success: false,
      error,
    });
  }

  // Store game and player mappings
  games.set(gameId, gameEngine);
  gamePlayers.set(gameId, [playerId]);
  playerGames.set(playerId, gameId);

  console.log(`Game ${gameId} created by ${playerName} (${playerId})`);

  res.status(200).json({
    success: true,
    data: {
      gameId,
      playerId,
      gameState: gameEngine.getGameState(),
    },
  });
}

async function joinGame(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  const { gameId, playerName } = req.body as JoinGameRequest;

  if (!gameId || !playerName) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Game ID and player name are required",
      },
    });
  }

  const gameEngine = games.get(gameId);
  if (!gameEngine) {
    return res.status(404).json({
      success: false,
      error: { code: "GAME_NOT_FOUND", message: "Game not found" },
    });
  }

  // Generate unique player ID
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add player to game
  const error = gameEngine.addPlayer(playerId, playerName);
  if (error) {
    return res.status(400).json({
      success: false,
      error,
    });
  }

  // Update player mappings
  const players = gamePlayers.get(gameId) || [];
  players.push(playerId);
  gamePlayers.set(gameId, players);
  playerGames.set(playerId, gameId);

  console.log(`Player ${playerName} (${playerId}) joined game ${gameId}`);

  res.status(200).json({
    success: true,
    data: {
      gameId,
      playerId,
      gameState: gameEngine.getGameState(),
    },
  });
}

async function leaveGame(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  const { gameId, playerId } = req.body;

  if (!gameId || !playerId) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Game ID and player ID are required",
      },
    });
  }

  const gameEngine = games.get(gameId);
  if (!gameEngine) {
    return res.status(404).json({
      success: false,
      error: { code: "GAME_NOT_FOUND", message: "Game not found" },
    });
  }

  // Remove player from game
  const error = gameEngine.removePlayer(playerId);
  if (error) {
    return res.status(400).json({
      success: false,
      error,
    });
  }

  // Update player mappings
  const players = gamePlayers.get(gameId) || [];
  const updatedPlayers = players.filter((p) => p !== playerId);
  gamePlayers.set(gameId, updatedPlayers);
  playerGames.delete(playerId);

  // Clean up empty games
  if (updatedPlayers.length === 0) {
    games.delete(gameId);
    gamePlayers.delete(gameId);
    console.log(`Cleaned up empty game: ${gameId}`);
  }

  console.log(`Player ${playerId} left game ${gameId}`);

  res.status(200).json({
    success: true,
    data: {
      gameState: gameEngine.getGameState(),
    },
  });
}

async function gameAction(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  try {
    const { gameId, playerId, gameAction } = req.body;

    console.log(`Game action received:`, { gameId, playerId, gameAction });

    if (!gameId || !playerId || !gameAction) {
      console.error("Missing required fields:", {
        gameId,
        playerId,
        gameAction,
      });
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Game ID, player ID, and action are required",
        },
      });
    }

    const gameEngine = games.get(gameId);
    if (!gameEngine) {
      console.error(`Game not found: ${gameId}`);
      console.log("Available games:", Array.from(games.keys()));
      return res.status(404).json({
        success: false,
        error: { code: "GAME_NOT_FOUND", message: "Game not found" },
      });
    }

    // Process the game action
    const action: GameAction = {
      ...gameAction,
      playerId,
    };

    console.log(`Processing action:`, action);
    console.log(`Game state before action:`, {
      phase: gameEngine.getGameState().phase,
      players: gameEngine
        .getGameState()
        .players.map((p) => ({ id: p.id, name: p.name, isReady: p.isReady })),
    });

    const error = gameEngine.processAction(action);
    if (error) {
      console.error(`Action failed:`, error);
      return res.status(400).json({
        success: false,
        error,
      });
    }

    console.log(
      `Player ${playerId} performed action ${action.type} in game ${gameId}`,
    );

    const newGameState = gameEngine.getGameState();
    console.log(`Game state after action:`, {
      phase: newGameState.phase,
      players: newGameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
      })),
    });

    res.status(200).json({
      success: true,
      data: {
        gameState: newGameState,
      },
    });
  } catch (error) {
    console.error("Error in gameAction:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    res.status(500).json({
      success: false,
      error: {
        code: "GAME_ACTION_ERROR",
        message: error instanceof Error ? error.message : "Game action failed",
        details: error instanceof Error ? error.stack : String(error),
      },
    });
  }
}

async function getGameState(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "Game ID is required" },
    });
  }

  const gameEngine = games.get(gameId);
  if (!gameEngine) {
    return res.status(404).json({
      success: false,
      error: { code: "GAME_NOT_FOUND", message: "Game not found" },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      gameState: gameEngine.getGameState(),
    },
  });
}
