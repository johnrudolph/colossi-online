import { v4 as uuidv4 } from "uuid";
import {
  GameState,
  Player,
  PlayerCard,
  GameAction,
  GameEvent,
  GameError,
  EnvironmentState,
  ScoreResult,
} from "../types/game";
import {
  createPlayerDeck,
  createEnvironmentDeck,
  createItemDeck,
  shuffleArray,
  PLAYER_COLORS,
} from "../data/cards";
import {
  drawCards,
  canPlayCard,
  getTotalPlayerPower,
  getTotalPreparedCards,
  canInitiateSkirmish,
} from "../utils/cards";

export class GameEngine {
  private gameState: GameState;
  private eventCallbacks: ((event: GameEvent) => void)[] = [];

  constructor(gameId?: string, maxPlayers: number = 4, isQuickGame = false) {
    const environmentDeck = shuffleArray(createEnvironmentDeck());
    const itemDeck = shuffleArray(createItemDeck());

    // Set up 3 initial environments
    const initialEnvironments = environmentDeck.slice(0, 3);
    const remainingEnvironmentDeck = environmentDeck.slice(3);

    this.gameState = {
      id: gameId || uuidv4(),
      players: [],
      currentPlayerIndex: 0,
      phase: "setup",
      preparedCards: {},
      activeEnvironmentId: null,
      skirmishInitiatorId: null,
      environmentStates: initialEnvironments.map((env) => ({
        environment: env,
        items: [itemDeck.pop()!], // Each environment starts with 1 item
        cardsInPlay: {},
        usedItems: {},
      })),
      turn: 0,
      maxPlayers,
      targetSkirmishes: isQuickGame ? 2 : 3,
      environmentDeck: remainingEnvironmentDeck,
      itemDeck: itemDeck.slice(0, -3), // Remove the 3 items we used
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initialize prepared cards for each environment
    initialEnvironments.forEach((env) => {
      this.gameState.preparedCards[env.id] = {};
    });
  }

  // Event handling
  public onEvent(callback: (event: GameEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  public removeEventListener(callback: (event: GameEvent) => void): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  private emitEvent(type: GameEvent["type"], data: unknown): void {
    const event: GameEvent = {
      type,
      gameId: this.gameState.id,
      data,
      timestamp: new Date(),
    };

    this.eventCallbacks.forEach((callback) => callback(event));
  }

  // Game state access
  public getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  public getPlayer(playerId: string): Player | null {
    return this.gameState.players.find((p) => p.id === playerId) || null;
  }

  public getCurrentPlayer(): Player | null {
    if (this.gameState.players.length === 0) return null;
    return this.gameState.players[this.gameState.currentPlayerIndex] || null;
  }

  // Player management
  public addPlayer(playerId: string, playerName: string): GameError | null {
    if (this.gameState.players.length >= this.gameState.maxPlayers) {
      return {
        code: "GAME_FULL",
        message: "Game is already full",
      };
    }

    if (this.gameState.players.some((p) => p.id === playerId)) {
      return {
        code: "PLAYER_NOT_IN_GAME",
        message: "Player is already in the game",
      };
    }

    const playerColor = PLAYER_COLORS[this.gameState.players.length];
    const deck = shuffleArray(createPlayerDeck());

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      color: playerColor,
      hand: [],
      deck,
      discardPile: [],
      isReady: false,
      isConnected: true,
      skirmishesWon: 0,
      hasPassed: false,
    };

    this.gameState.players.push(newPlayer);
    this.gameState.updatedAt = new Date();

    // Initialize prepared cards for this player in all environments
    Object.keys(this.gameState.preparedCards).forEach((envId) => {
      this.gameState.preparedCards[envId][playerId] = [];
    });

    this.emitEvent("PLAYER_JOINED", { player: newPlayer });
    this.checkGameStart();

    return null;
  }

  public removePlayer(playerId: string): GameError | null {
    const playerIndex = this.gameState.players.findIndex(
      (p) => p.id === playerId,
    );

    if (playerIndex === -1) {
      return {
        code: "PLAYER_NOT_IN_GAME",
        message: "Player is not in this game",
      };
    }

    const removedPlayer = this.gameState.players[playerIndex];
    this.gameState.players.splice(playerIndex, 1);

    // Adjust current player index if needed
    if (
      this.gameState.currentPlayerIndex >= playerIndex &&
      this.gameState.currentPlayerIndex > 0
    ) {
      this.gameState.currentPlayerIndex--;
    }

    // Remove player from prepared cards
    Object.keys(this.gameState.preparedCards).forEach((envId) => {
      delete this.gameState.preparedCards[envId][playerId];
    });

    this.gameState.updatedAt = new Date();
    this.emitEvent("PLAYER_LEFT", { player: removedPlayer });

    // End game if not enough players
    if (this.gameState.players.length < 2 && this.gameState.phase !== "setup") {
      this.endGame();
    }

    return null;
  }

  public setPlayerReady(playerId: string, isReady: boolean): GameError | null {
    const player = this.getPlayer(playerId);

    if (!player) {
      return {
        code: "PLAYER_NOT_IN_GAME",
        message: "Player is not in this game",
      };
    }

    player.isReady = isReady;
    this.gameState.updatedAt = new Date();

    this.emitEvent("GAME_UPDATED", { gameState: this.getGameState() });
    this.checkGameStart();

    return null;
  }

  public setPlayerConnection(playerId: string, isConnected: boolean): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isConnected = isConnected;
      this.gameState.updatedAt = new Date();
      this.emitEvent("GAME_UPDATED", { gameState: this.getGameState() });
    }
  }

  // Game flow
  private checkGameStart(): void {
    if (
      this.gameState.phase === "setup" &&
      this.gameState.players.length >= 2 &&
      this.gameState.players.every((p) => p.isReady)
    ) {
      this.startHandbuilding();
    }
  }

  private startHandbuilding(): void {
    this.gameState.phase = "handbuilding";
    this.gameState.turn = 1;
    this.gameState.currentPlayerIndex = 0;

    // Each player draws 3 cards to start
    this.gameState.players.forEach((player) => {
      const { drawnCards, remainingDeck } = drawCards(player.deck, 3);
      player.hand = drawnCards;
      player.deck = remainingDeck;
      player.hasPassed = false;
    });

    this.gameState.updatedAt = new Date();
    this.emitEvent("PHASE_CHANGED", {
      phase: "handbuilding",
      gameState: this.getGameState(),
    });
  }

  // Game actions
  public processAction(action: GameAction): GameError | null {
    const player = this.getPlayer(action.playerId);

    if (!player) {
      return {
        code: "PLAYER_NOT_IN_GAME",
        message: "Player is not in this game",
      };
    }

    switch (action.type) {
      case "READY_UP":
        return this.setPlayerReady(action.playerId, true);

      case "PREPARE_CARD":
        return this.prepareCardAction(action.playerId, action.payload);

      case "INITIATE_SKIRMISH":
        return this.initiateSkirmishAction(action.playerId, action.payload);

      case "PLAY_CARD":
        return this.playCardAction(action.playerId, action.payload);

      case "TAKE_ITEM":
        return this.takeItemAction(action.playerId, action.payload);

      case "PASS":
        return this.passAction(action.playerId, action.payload);

      case "DISCARD_TO_HAND_LIMIT":
        return this.discardToHandLimitAction(action.playerId, action.payload);

      default:
        return {
          code: "INVALID_MOVE",
          message: "Invalid action type",
        };
    }
  }

  private prepareCardAction(
    playerId: string,
    payload?: GameAction["payload"],
  ): GameError | null {
    if (this.gameState.phase !== "handbuilding") {
      return {
        code: "WRONG_PHASE",
        message: "Can only prepare cards during handbuilding phase",
      };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return {
        code: "NOT_PLAYER_TURN",
        message: "It is not your turn",
      };
    }

    const { cardId, environmentId } = payload || {};
    if (!cardId || !environmentId) {
      return {
        code: "INVALID_MOVE",
        message: "Card ID and Environment ID are required",
      };
    }

    const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return {
        code: "INVALID_MOVE",
        message: "Card not found in hand",
      };
    }

    const environment = this.gameState.environmentStates.find(
      (env) => env.environment.id === environmentId,
    );
    if (!environment) {
      return {
        code: "INVALID_MOVE",
        message: "Environment not found",
      };
    }

    // Move card from hand to prepared cards
    const card = currentPlayer.hand.splice(cardIndex, 1)[0];
    this.gameState.preparedCards[environmentId][playerId].push(card);

    // Draw a new card to maintain 3-card hand
    if (currentPlayer.deck.length > 0) {
      const { drawnCards, remainingDeck } = drawCards(currentPlayer.deck, 1);
      currentPlayer.hand.push(...drawnCards);
      currentPlayer.deck = remainingDeck;
    }

    this.emitEvent("CARD_PREPARED", {
      playerId,
      card,
      environmentId,
    });

    this.nextTurn();
    return null;
  }

  private initiateSkirmishAction(
    playerId: string,
    payload?: GameAction["payload"],
  ): GameError | null {
    if (this.gameState.phase !== "handbuilding") {
      return {
        code: "WRONG_PHASE",
        message: "Can only initiate skirmishes during handbuilding phase",
      };
    }

    const { environmentId } = payload || {};
    if (!environmentId) {
      return {
        code: "INVALID_MOVE",
        message: "Environment ID is required",
      };
    }

    const preparedCards = this.gameState.preparedCards[environmentId];
    if (!canInitiateSkirmish(preparedCards)) {
      return {
        code: "ENVIRONMENT_NOT_READY",
        message: "Need at least 8 total prepared cards to initiate skirmish",
      };
    }

    this.startSkirmish(environmentId, playerId);
    return null;
  }

  private startSkirmish(environmentId: string, initiatorId: string): void {
    this.gameState.phase = "skirmish";
    this.gameState.activeEnvironmentId = environmentId;
    this.gameState.skirmishInitiatorId = initiatorId;

    // All players pick up their prepared cards and add to hand
    const preparedCards = this.gameState.preparedCards[environmentId];
    this.gameState.players.forEach((player) => {
      const playerPreparedCards = preparedCards[player.id] || [];
      player.hand.push(...playerPreparedCards);
      player.hasPassed = false;

      // Discard down to 10 cards if needed
      if (player.hand.length > 10) {
        const excess = player.hand.length - 10;
        const discarded = player.hand.splice(-excess, excess);
        player.discardPile.push(...discarded);
      }
    });

    // Clear prepared cards for this environment
    Object.keys(preparedCards).forEach((pId) => {
      preparedCards[pId] = [];
    });

    // Set turn to initiator
    const initiatorIndex = this.gameState.players.findIndex(
      (p) => p.id === initiatorId,
    );
    this.gameState.currentPlayerIndex = initiatorIndex;

    this.gameState.updatedAt = new Date();
    this.emitEvent("SKIRMISH_INITIATED", {
      environmentId,
      initiatorId,
      gameState: this.getGameState(),
    });
  }

  private playCardAction(
    playerId: string,
    payload?: GameAction["payload"],
  ): GameError | null {
    if (this.gameState.phase !== "skirmish") {
      return {
        code: "WRONG_PHASE",
        message: "Can only play cards during skirmish phase",
      };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return {
        code: "NOT_PLAYER_TURN",
        message: "It is not your turn",
      };
    }

    if (currentPlayer.hasPassed) {
      return {
        code: "INVALID_MOVE",
        message: "You have already passed",
      };
    }

    const { cardId } = payload || {};
    if (!cardId) {
      return {
        code: "INVALID_MOVE",
        message: "Card ID is required",
      };
    }

    const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return {
        code: "INVALID_MOVE",
        message: "Card not found in hand",
      };
    }

    const card = currentPlayer.hand[cardIndex];
    const environment = this.gameState.environmentStates.find(
      (env) => env.environment.id === this.gameState.activeEnvironmentId,
    );

    if (!environment) {
      return {
        code: "INVALID_MOVE",
        message: "No active environment",
      };
    }

    // Get all cards currently in play for validation
    const allCardsInPlay = Object.values(environment.cardsInPlay).flat();

    // Check if card can be played
    if (!canPlayCard(card, environment.environment.title, allCardsInPlay)) {
      return {
        code: "CANNOT_PLAY_CARD",
        message: "This card cannot be played right now",
      };
    }

    // Play the card
    currentPlayer.hand.splice(cardIndex, 1);
    if (!environment.cardsInPlay[playerId]) {
      environment.cardsInPlay[playerId] = [];
    }
    environment.cardsInPlay[playerId].push(card);

    this.emitEvent("CARD_PLAYED", {
      playerId,
      card,
      environmentId: this.gameState.activeEnvironmentId,
    });

    this.nextTurn();
    return null;
  }

  private takeItemAction(
    playerId: string,
    payload?: GameAction["payload"],
  ): GameError | null {
    if (this.gameState.phase !== "skirmish") {
      return {
        code: "WRONG_PHASE",
        message: "Can only take items during skirmish phase",
      };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return {
        code: "NOT_PLAYER_TURN",
        message: "It is not your turn",
      };
    }

    if (currentPlayer.hasPassed) {
      return {
        code: "INVALID_MOVE",
        message: "You have already passed",
      };
    }

    if (currentPlayer.hand.length === 0) {
      return {
        code: "INSUFFICIENT_CARDS",
        message: "Must have at least 1 card in hand to take an item",
      };
    }

    const { itemId, discardedCardIds } = payload || {};
    if (!itemId) {
      return {
        code: "INVALID_MOVE",
        message: "Item ID is required",
      };
    }

    const environment = this.gameState.environmentStates.find(
      (env) => env.environment.id === this.gameState.activeEnvironmentId,
    );

    if (!environment) {
      return {
        code: "INVALID_MOVE",
        message: "No active environment",
      };
    }

    const itemIndex = environment.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return {
        code: "ITEM_NOT_AVAILABLE",
        message: "Item not available",
      };
    }

    const item = environment.items[itemIndex];
    const discardCost =
      typeof item.discard_cost === "number" ? item.discard_cost : 0;

    // Validate discard cost
    if (discardCost > 0) {
      if (!discardedCardIds || discardedCardIds.length !== discardCost) {
        return {
          code: "INSUFFICIENT_CARDS",
          message: `Must discard ${discardCost} cards to take this item`,
        };
      }

      // Verify player has these cards
      const discardableCards = discardedCardIds.map((id) =>
        currentPlayer.hand.find((c) => c.id === id),
      );
      if (discardableCards.some((c) => !c)) {
        return {
          code: "INVALID_MOVE",
          message: "Some discarded cards not found in hand",
        };
      }

      // Discard the cards
      discardedCardIds.forEach((id) => {
        const cardIndex = currentPlayer.hand.findIndex((c) => c.id === id);
        if (cardIndex !== -1) {
          const discardedCard = currentPlayer.hand.splice(cardIndex, 1)[0];
          currentPlayer.discardPile.push(discardedCard);
        }
      });
    }

    // Take the item
    environment.items.splice(itemIndex, 1);
    if (!environment.usedItems[playerId]) {
      environment.usedItems[playerId] = [];
    }
    environment.usedItems[playerId].push(item);

    this.emitEvent("ITEM_TAKEN", {
      playerId,
      item,
      environmentId: this.gameState.activeEnvironmentId,
    });

    this.nextTurn();
    return null;
  }

  private passAction(
    playerId: string,
    payload?: GameAction["payload"],
  ): GameError | null {
    if (this.gameState.phase !== "skirmish") {
      return {
        code: "WRONG_PHASE",
        message: "Can only pass during skirmish phase",
      };
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      return {
        code: "PLAYER_NOT_IN_GAME",
        message: "Player not in game",
      };
    }

    if (player.hasPassed) {
      return {
        code: "INVALID_MOVE",
        message: "You have already passed",
      };
    }

    player.hasPassed = true;

    // Move remaining cards to other environments
    if (player.hand.length > 0) {
      // For now, just discard remaining cards
      // TODO: Implement moving cards to other environments
      player.discardPile.push(...player.hand);
      player.hand = [];
    }

    this.emitEvent("PLAYER_PASSED", {
      playerId,
    });

    // Check if skirmish should end
    if (this.shouldEndSkirmish()) {
      this.endSkirmish();
    } else {
      this.nextTurn();
    }

    return null;
  }

  private discardToHandLimitAction(
    playerId: string,
    payload?: GameAction["payload"],
  ): GameError | null {
    const player = this.getPlayer(playerId);
    if (!player) {
      return {
        code: "PLAYER_NOT_IN_GAME",
        message: "Player not in game",
      };
    }

    const { discardedCardIds } = payload || {};
    if (!discardedCardIds) {
      return {
        code: "INVALID_MOVE",
        message: "Must specify cards to discard",
      };
    }

    // Discard specified cards
    const discardedCards: PlayerCard[] = [];
    discardedCardIds.forEach((cardId: string) => {
      const cardIndex = player.hand.findIndex((c) => c.id === cardId);
      if (cardIndex !== -1) {
        const card = player.hand.splice(cardIndex, 1)[0];
        discardedCards.push(card);
      }
    });

    player.discardPile.push(...discardedCards);

    // Validate hand limit
    const handLimit = this.gameState.phase === "handbuilding" ? 3 : 10;
    if (player.hand.length > handLimit) {
      return {
        code: "HAND_LIMIT_EXCEEDED",
        message: `Hand still exceeds limit of ${handLimit}`,
      };
    }

    this.emitEvent("GAME_UPDATED", { gameState: this.getGameState() });
    return null;
  }

  private shouldEndSkirmish(): boolean {
    return this.gameState.players.every(
      (p) => p.hasPassed || p.hand.length === 0,
    );
  }

  private endSkirmish(): void {
    const activeEnvironment = this.gameState.environmentStates.find(
      (env) => env.environment.id === this.gameState.activeEnvironmentId,
    );

    if (!activeEnvironment) return;

    // Calculate scores
    const scores = this.calculateScores(activeEnvironment);
    const winner = this.determineWinner(scores);

    if (winner) {
      const winningPlayer = this.getPlayer(winner.playerId);
      if (winningPlayer) {
        winningPlayer.skirmishesWon++;
      }
    }

    // Clean up the environment
    this.cleanupAfterSkirmish(activeEnvironment);

    this.emitEvent("SKIRMISH_ENDED", {
      environmentId: this.gameState.activeEnvironmentId,
      scores,
      winner,
    });

    // Check for game end
    if (
      winner &&
      this.getPlayer(winner.playerId)!.skirmishesWon >=
        this.gameState.targetSkirmishes
    ) {
      this.endGame(winner.playerId);
    } else {
      this.startNextRound();
    }
  }

  private calculateScores(environment: EnvironmentState): ScoreResult[] {
    return this.gameState.players.map((player) => {
      const playerCards = environment.cardsInPlay[player.id] || [];
      const opponentCards = this.gameState.players
        .filter((p) => p.id !== player.id)
        .map((p) => environment.cardsInPlay[p.id] || []);

      const power = getTotalPlayerPower(
        playerCards,
        player,
        Object.values(environment.cardsInPlay).flat(),
        opponentCards,
      );

      return {
        playerId: player.id,
        playerName: player.name,
        power,
        cardsInPlay: playerCards.length,
        isWinner: false, // Will be set by determineWinner
      };
    });
  }

  private determineWinner(scores: ScoreResult[]): ScoreResult | null {
    if (scores.length === 0) return null;

    // Sort by power (descending), then by cards in play (descending)
    const sortedScores = [...scores].sort((a, b) => {
      if (a.power !== b.power) return b.power - a.power;
      return b.cardsInPlay - a.cardsInPlay;
    });

    const winner = sortedScores[0];
    winner.isWinner = true;
    return winner;
  }

  private cleanupAfterSkirmish(environment: EnvironmentState): void {
    // Discard all cards in play
    Object.entries(environment.cardsInPlay).forEach(([playerId, cards]) => {
      const player = this.getPlayer(playerId);
      if (player) {
        player.discardPile.push(...cards);
      }
    });

    // Clear cards in play
    environment.cardsInPlay = {};

    // Discard unused items
    if (environment.items.length > 0) {
      // Items are discarded (not implemented - item discard pile)
      environment.items = [];
    }

    // Replace environment with new one from deck
    if (this.gameState.environmentDeck.length > 0) {
      const newEnvironment = this.gameState.environmentDeck.shift()!;
      environment.environment = newEnvironment;

      // Add new item(s)
      const itemsToAdd = Math.min(1, this.gameState.itemDeck.length);
      for (let i = 0; i < itemsToAdd; i++) {
        if (this.gameState.itemDeck.length > 0) {
          environment.items.push(this.gameState.itemDeck.shift()!);
        }
      }

      // Update prepared cards for new environment
      this.gameState.preparedCards[newEnvironment.id] = {};
      this.gameState.players.forEach((player) => {
        this.gameState.preparedCards[newEnvironment.id][player.id] = [];
      });

      // Remove old environment from prepared cards
      delete this.gameState.preparedCards[this.gameState.activeEnvironmentId!];
    }
  }

  private startNextRound(): void {
    this.gameState.phase = "handbuilding";
    this.gameState.activeEnvironmentId = null;
    this.gameState.skirmishInitiatorId = null;

    // Reset player states
    this.gameState.players.forEach((player) => {
      player.hasPassed = false;
      // Draw back up to 3 cards if needed
      const needCards = Math.max(0, 3 - player.hand.length);
      if (needCards > 0 && player.deck.length > 0) {
        const { drawnCards, remainingDeck } = drawCards(player.deck, needCards);
        player.hand.push(...drawnCards);
        player.deck = remainingDeck;
      }
    });

    // Next player starts
    this.nextTurn();

    this.emitEvent("PHASE_CHANGED", {
      phase: "handbuilding",
      gameState: this.getGameState(),
    });
  }

  private nextTurn(): void {
    this.gameState.currentPlayerIndex =
      (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    this.gameState.turn++;
    this.gameState.updatedAt = new Date();

    this.emitEvent("GAME_UPDATED", { gameState: this.getGameState() });
  }

  private endGame(winnerId?: string): void {
    this.gameState.phase = "finished";
    this.gameState.updatedAt = new Date();

    const finalScores = this.gameState.players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      skirmishesWon: p.skirmishesWon,
    }));

    this.emitEvent("GAME_ENDED", {
      winner: winnerId ? this.getPlayer(winnerId) : null,
      finalScores,
    });
  }

  // Utility methods
  public canPlayerAct(playerId: string): boolean {
    const currentPlayer = this.getCurrentPlayer();
    return (
      (this.gameState.phase === "handbuilding" ||
        this.gameState.phase === "skirmish") &&
      currentPlayer !== null &&
      currentPlayer.id === playerId
    );
  }

  public isGameFull(): boolean {
    return this.gameState.players.length >= this.gameState.maxPlayers;
  }

  public serialize(): string {
    return JSON.stringify(this.gameState);
  }

  public static deserialize(data: string): GameEngine {
    const gameState = JSON.parse(data) as GameState;
    const engine = new GameEngine(
      gameState.id,
      gameState.maxPlayers,
      gameState.targetSkirmishes === 2,
    );
    engine.gameState = {
      ...gameState,
      createdAt: new Date(gameState.createdAt),
      updatedAt: new Date(gameState.updatedAt),
    };
    return engine;
  }
}
