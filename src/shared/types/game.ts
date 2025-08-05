export type CardType =
  | "Acolyte"
  | "Beast"
  | "Colossus"
  | "Divine Gift"
  | "Electric"
  | "Fire"
  | "Water";

export interface PlayerCard {
  id: string;
  title: string;
  type: CardType;
  power: number | string; // Can be "?" for dynamic power
  effect: string;
  image: string;
}

export interface Environment {
  id: string;
  title: string;
  description: string;
  image?: string;
}

export interface Item {
  id: string;
  title: string;
  type: "Perk" | "Discard";
  description: string;
  discard_cost: number | string; // Can be "?" for variable cost
  image?: string;
}

export interface Player {
  id: string;
  name: string;
  color: "black" | "brown" | "tan" | "white";
  hand: PlayerCard[];
  deck: PlayerCard[];
  discardPile: PlayerCard[];
  isReady: boolean;
  isConnected: boolean;
  skirmishesWon: number;
  hasPassed: boolean;
}

export interface PreparedCards {
  [environmentId: string]: {
    [playerId: string]: PlayerCard[];
  };
}

export interface EnvironmentState {
  environment: Environment;
  items: Item[];
  cardsInPlay: {
    [playerId: string]: PlayerCard[];
  };
  usedItems: {
    [playerId: string]: Item[];
  };
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  phase: "setup" | "handbuilding" | "skirmish" | "scoring" | "finished";

  // Handbuilding phase data
  preparedCards: PreparedCards;

  // Skirmish phase data
  activeEnvironmentId: string | null;
  skirmishInitiatorId: string | null;
  environmentStates: EnvironmentState[];

  // Game progression
  turn: number;
  maxPlayers: number;
  targetSkirmishes: number; // 2 for quick game, 3 for full game

  // Decks
  environmentDeck: Environment[];
  itemDeck: Item[];

  createdAt: Date;
  updatedAt: Date;
}

export interface GameAction {
  type:
    | "READY_UP"
    | "PREPARE_CARD"
    | "INITIATE_SKIRMISH"
    | "PLAY_CARD"
    | "TAKE_ITEM"
    | "PASS"
    | "DISCARD_TO_HAND_LIMIT";
  playerId: string;
  payload?: {
    cardId?: string;
    environmentId?: string;
    itemId?: string;
    targetPlayerId?: string;
    discardedCardIds?: string[];
    [key: string]: unknown;
  };
}

export interface GameEvent {
  type:
    | "GAME_UPDATED"
    | "PLAYER_JOINED"
    | "PLAYER_LEFT"
    | "PHASE_CHANGED"
    | "CARD_PREPARED"
    | "SKIRMISH_INITIATED"
    | "CARD_PLAYED"
    | "ITEM_TAKEN"
    | "PLAYER_PASSED"
    | "SKIRMISH_ENDED"
    | "GAME_ENDED";
  gameId: string;
  data: unknown;
  timestamp: Date;
}

export interface CreateGameRequest {
  playerName: string;
  maxPlayers?: number;
  isQuickGame?: boolean; // 2 skirmishes instead of 3
}

export interface JoinGameRequest {
  gameId: string;
  playerName: string;
}

export interface GameError {
  code:
    | "GAME_NOT_FOUND"
    | "GAME_FULL"
    | "INVALID_MOVE"
    | "NOT_PLAYER_TURN"
    | "PLAYER_NOT_IN_GAME"
    | "WRONG_PHASE"
    | "INSUFFICIENT_CARDS"
    | "ENVIRONMENT_NOT_READY"
    | "HAND_LIMIT_EXCEEDED"
    | "CANNOT_PLAY_CARD"
    | "ITEM_NOT_AVAILABLE";
  message: string;
}

export interface ScoreResult {
  playerId: string;
  playerName: string;
  power: number;
  cardsInPlay: number;
  isWinner: boolean;
}
