import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { GameEngine } from "../shared/game/GameEngine";
import {
  GameAction,
  CreateGameRequest,
  JoinGameRequest,
  GameState,
  GameEvent,
} from "../shared/types/game";

interface ServerToClientEvents {
  gameUpdated: (gameState: GameState) => void;
  gameEvent: (event: GameEvent) => void;
  error: (error: { code: string; message: string }) => void;
  playerJoined: (data: { player: unknown }) => void;
  playerLeft: (data: { player: unknown }) => void;
  phaseChanged: (data: { phase: string; gameState: unknown }) => void;
  cardPrepared: (data: {
    playerId: string;
    card: unknown;
    environmentId: string;
  }) => void;
  skirmishInitiated: (data: {
    environmentId: string;
    initiatorId: string;
    gameState: unknown;
  }) => void;
  cardPlayed: (data: {
    playerId: string;
    card: unknown;
    environmentId: string;
  }) => void;
  itemTaken: (data: {
    playerId: string;
    item: unknown;
    environmentId: string;
  }) => void;
  playerPassed: (data: { playerId: string }) => void;
  skirmishEnded: (data: {
    environmentId: string;
    scores: unknown[];
    winner: unknown;
  }) => void;
  gameEnded: (data: { winner: unknown; finalScores: unknown[] }) => void;
}

interface ClientToServerEvents {
  createGame: (
    data: CreateGameRequest,
    callback: (response: CreateGameResponse) => void,
  ) => void;
  joinGame: (
    data: JoinGameRequest,
    callback: (response: JoinGameResponse) => void,
  ) => void;
  leaveGame: (gameId: string) => void;
  gameAction: (action: GameAction) => void;
  disconnect: () => void;
}

interface CreateGameResponse {
  success: boolean;
  gameId?: string;
  playerId?: string;
  gameState?: GameState;
  error?: { code: string; message: string };
}

interface JoinGameResponse {
  success: boolean;
  gameId?: string;
  playerId?: string;
  gameState?: GameState;
  error?: { code: string; message: string };
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  playerId: string;
  playerName: string;
  gameId?: string;
}

export class SocketGameServer {
  private io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  private games: Map<string, GameEngine> = new Map();
  private playerSockets: Map<string, string> = new Map(); // playerId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? false
            : ["http://localhost:3000"],
        methods: ["GET", "POST"],
      },
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on("connection", (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Generate a unique player ID for this connection
      const playerId = `player_${socket.id}`;
      socket.data.playerId = playerId;
      this.playerSockets.set(playerId, socket.id);

      // Handle game creation
      socket.on("createGame", (data: CreateGameRequest, callback) => {
        try {
          const gameEngine = new GameEngine(undefined, data.maxPlayers || 4);
          const gameId = gameEngine.getGameState().id;

          this.games.set(gameId, gameEngine);

          // Set up game event listeners
          this.setupGameEventListeners(gameEngine);

          // Add the creator as the first player
          socket.data.playerName = data.playerName;
          socket.data.gameId = gameId;

          const error = gameEngine.addPlayer(playerId, data.playerName);
          if (error) {
            callback({ success: false, error });
            return;
          }

          // Join the socket room for this game
          socket.join(gameId);

          callback({
            success: true,
            gameId,
            playerId,
            gameState: gameEngine.getGameState(),
          });

          console.log(`Game created: ${gameId} by ${data.playerName}`);
        } catch (err) {
          console.error("Error creating game:", err);
          callback({
            success: false,
            error: {
              code: "GAME_CREATION_FAILED",
              message: "Failed to create game",
            },
          });
        }
      });

      // Handle joining existing game
      socket.on("joinGame", (data: JoinGameRequest, callback) => {
        try {
          const gameEngine = this.games.get(data.gameId);

          if (!gameEngine) {
            callback({
              success: false,
              error: { code: "GAME_NOT_FOUND", message: "Game not found" },
            });
            return;
          }

          socket.data.playerName = data.playerName;
          socket.data.gameId = data.gameId;

          const error = gameEngine.addPlayer(playerId, data.playerName);
          if (error) {
            callback({ success: false, error });
            return;
          }

          // Join the socket room for this game
          socket.join(data.gameId);

          callback({
            success: true,
            gameId: data.gameId,
            playerId,
            gameState: gameEngine.getGameState(),
          });

          console.log(`Player ${data.playerName} joined game ${data.gameId}`);
        } catch (err) {
          console.error("Error joining game:", err);
          callback({
            success: false,
            error: { code: "JOIN_GAME_FAILED", message: "Failed to join game" },
          });
        }
      });

      // Handle game actions
      socket.on("gameAction", (action: GameAction) => {
        try {
          if (!socket.data.gameId) {
            socket.emit("error", { code: "NO_GAME", message: "Not in a game" });
            return;
          }

          const gameEngine = this.games.get(socket.data.gameId);
          if (!gameEngine) {
            socket.emit("error", {
              code: "GAME_NOT_FOUND",
              message: "Game not found",
            });
            return;
          }

          // Ensure the action is from the correct player
          action.playerId = playerId;

          const error = gameEngine.processAction(action);
          if (error) {
            socket.emit("error", error);
          }
        } catch (err) {
          console.error("Error processing game action:", err);
          socket.emit("error", {
            code: "ACTION_FAILED",
            message: "Failed to process action",
          });
        }
      });

      // Handle leaving game
      socket.on("leaveGame", (gameId: string) => {
        this.handlePlayerLeave(socket, gameId);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);

        if (socket.data.gameId) {
          this.handlePlayerLeave(socket, socket.data.gameId);
        }

        this.playerSockets.delete(playerId);
      });
    });
  }

  private handlePlayerLeave(
    socket: { data: SocketData; leave: (room: string) => void },
    gameId: string,
  ): void {
    try {
      const gameEngine = this.games.get(gameId);
      if (!gameEngine) return;

      const playerId = socket.data.playerId;
      gameEngine.removePlayer(playerId);

      // Leave the socket room
      socket.leave(gameId);
      socket.data.gameId = undefined;

      console.log(`Player ${socket.data.playerName} left game ${gameId}`);

      // Clean up empty games
      const gameState = gameEngine.getGameState();
      if (gameState.players.length === 0) {
        this.games.delete(gameId);
        console.log(`Cleaned up empty game: ${gameId}`);
      }
    } catch (err) {
      console.error("Error handling player leave:", err);
    }
  }

  private setupGameEventListeners(gameEngine: GameEngine): void {
    gameEngine.onEvent((event) => {
      const gameId = event.gameId;

      switch (event.type) {
        case "GAME_UPDATED":
          this.io
            .to(gameId)
            .emit(
              "gameUpdated",
              (event.data as { gameState: GameState }).gameState,
            );
          break;

        case "PLAYER_JOINED":
          this.io
            .to(gameId)
            .emit("playerJoined", event.data as { player: unknown });
          break;

        case "PLAYER_LEFT":
          this.io
            .to(gameId)
            .emit("playerLeft", event.data as { player: unknown });
          break;

        case "CARD_PLAYED":
          this.io
            .to(gameId)
            .emit(
              "cardPlayed",
              event.data as {
                playerId: string;
                card: unknown;
                environmentId: string;
              },
            );
          break;

        case "PHASE_CHANGED":
          this.io
            .to(gameId)
            .emit(
              "phaseChanged",
              event.data as { phase: string; gameState: unknown },
            );
          break;

        case "CARD_PREPARED":
          this.io
            .to(gameId)
            .emit(
              "cardPrepared",
              event.data as {
                playerId: string;
                card: unknown;
                environmentId: string;
              },
            );
          break;

        case "SKIRMISH_INITIATED":
          this.io
            .to(gameId)
            .emit(
              "skirmishInitiated",
              event.data as {
                environmentId: string;
                initiatorId: string;
                gameState: unknown;
              },
            );
          break;

        case "ITEM_TAKEN":
          this.io
            .to(gameId)
            .emit(
              "itemTaken",
              event.data as {
                playerId: string;
                item: unknown;
                environmentId: string;
              },
            );
          break;

        case "PLAYER_PASSED":
          this.io
            .to(gameId)
            .emit("playerPassed", event.data as { playerId: string });
          break;

        case "SKIRMISH_ENDED":
          this.io
            .to(gameId)
            .emit(
              "skirmishEnded",
              event.data as {
                environmentId: string;
                scores: unknown[];
                winner: unknown;
              },
            );
          break;

        case "GAME_ENDED":
          this.io
            .to(gameId)
            .emit(
              "gameEnded",
              event.data as { winner: unknown; finalScores: unknown[] },
            );
          break;

        default:
          this.io.to(gameId).emit("gameEvent", event);
      }
    });
  }

  // Utility methods
  public getGameCount(): number {
    return this.games.size;
  }

  public getActivePlayerCount(): number {
    return this.playerSockets.size;
  }

  public getGameById(gameId: string): GameEngine | undefined {
    return this.games.get(gameId);
  }

  public getAllGames(): Array<{
    id: string;
    playerCount: number;
    phase: string;
  }> {
    return Array.from(this.games.entries()).map(([id, engine]) => {
      const state = engine.getGameState();
      return {
        id,
        playerCount: state.players.length,
        phase: state.phase,
      };
    });
  }
}
