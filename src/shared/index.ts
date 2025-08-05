// Game Engine and Core Logic
export { GameEngine } from "./game/GameEngine";

// Types
export type {
  CardType,
  PlayerCard,
  Environment,
  Item,
  Player,
  PreparedCards,
  EnvironmentState,
  GameState,
  GameAction,
  GameEvent,
  GameError,
  CreateGameRequest,
  JoinGameRequest,
  ScoreResult,
} from "./types/game";

// Card Data
export {
  PLAYER_CARD_DATA,
  ENVIRONMENT_DATA,
  ITEM_DATA,
  PLAYER_COLORS,
  createPlayerDeck,
  createEnvironmentDeck,
  createItemDeck,
  shuffleArray,
  getCardImagePath,
  getPlayerCardBackPath,
} from "./data/cards";

// Utilities
export {
  drawCards,
  calculateCardPower,
  canPlayCard,
  getTotalPlayerPower,
  getCardsByType,
  hasCardType,
  countCardsByType,
  getCardDisplayName,
  getCardTypeIcon,
  sortHandByType,
  validateHandLimit,
  getTotalPreparedCards,
  canInitiateSkirmish,
} from "./utils/cards";
