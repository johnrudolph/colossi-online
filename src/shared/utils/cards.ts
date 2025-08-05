import { PlayerCard, Player, CardType } from "../types/game";

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(
  deck: PlayerCard[],
  count: number,
): { drawnCards: PlayerCard[]; remainingDeck: PlayerCard[] } {
  const drawnCards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  return { drawnCards, remainingDeck };
}

export function calculateCardPower(
  card: PlayerCard,
  player: Player,
  allCardsInPlay: PlayerCard[],
  playerCardsInPlay: PlayerCard[],
  opponentCardsInPlay: PlayerCard[][],
): number {
  let basePower = typeof card.power === "number" ? card.power : 0;

  // Handle dynamic power cards
  if (card.power === "?") {
    switch (card.title) {
      case "Channel Power":
        // Find opponent with most cards in play
        const maxOpponentCards = Math.max(
          ...opponentCardsInPlay.map((cards) => cards.length),
        );
        basePower = maxOpponentCards;
        break;
      default:
        basePower = 0;
    }
  }

  // Apply power modifications from other cards
  let finalPower = basePower;

  // Water card effects on Fire and Electric
  const waterCards = allCardsInPlay.filter((c) => c.type === "Water");
  if (waterCards.length > 0) {
    if (card.type === "Electric") {
      finalPower += 2 * waterCards.length;
    } else if (card.type === "Fire") {
      finalPower -= 2 * waterCards.length;
    }
  }

  // Acolyte bonus power
  if (card.type === "Acolyte") {
    const playerAcolytes = playerCardsInPlay.filter(
      (c) => c.type === "Acolyte",
    ).length;
    const hasMoreAcolytesThanOpponents = opponentCardsInPlay.every(
      (opponentCards) =>
        playerAcolytes >
        opponentCards.filter((c) => c.type === "Acolyte").length,
    );
    if (hasMoreAcolytesThanOpponents) {
      finalPower += 3;
    }
  }

  // Power cannot go below 0
  return Math.max(0, finalPower);
}

export function canPlayCard(
  card: PlayerCard,
  environmentTitle: string,
  allCardsInPlay: PlayerCard[],
): boolean {
  // Check for Fire cards blocking Beast cards
  const fireCardsInPlay = allCardsInPlay.filter((c) => c.type === "Fire");
  if (card.type === "Beast" && fireCardsInPlay.length > 0) {
    return false;
  }

  // Environment-specific restrictions
  switch (environmentTitle) {
    case "Badlands":
      if (card.type === "Fire") return false;
      break;
    case "Desert":
      if (card.type === "Water") return false;
      break;
    case "Hallowed Ground":
      // Can only play Water, Fire, Electric if you have more Acolytes than opponents
      if (
        card.type === "Water" ||
        card.type === "Fire" ||
        card.type === "Electric"
      ) {
        // This would need additional context about opponent Acolytes
        // For now, we'll allow it and check in the game engine
      }
      break;
  }

  return true;
}

export function getTotalPlayerPower(
  playerCards: PlayerCard[],
  player: Player,
  allCardsInPlay: PlayerCard[],
  opponentCardsInPlay: PlayerCard[][],
): number {
  return playerCards.reduce((total, card) => {
    return (
      total +
      calculateCardPower(
        card,
        player,
        allCardsInPlay,
        playerCards,
        opponentCardsInPlay,
      )
    );
  }, 0);
}

export function getCardsByType(
  cards: PlayerCard[],
  type: CardType,
): PlayerCard[] {
  return cards.filter((card) => card.type === type);
}

export function hasCardType(cards: PlayerCard[], type: CardType): boolean {
  return cards.some((card) => card.type === type);
}

export function countCardsByType(cards: PlayerCard[], type: CardType): number {
  return cards.filter((card) => card.type === type).length;
}

export function getCardDisplayName(card: PlayerCard): string {
  return card.title;
}

export function getCardTypeIcon(type: CardType): string {
  const icons = {
    Acolyte: "⚔️",
    Beast: "🐉",
    Colossus: "👑",
    "Divine Gift": "✨",
    Electric: "⚡",
    Fire: "🔥",
    Water: "💧",
  };
  return icons[type] || "❓";
}

export function sortHandByType(hand: PlayerCard[]): PlayerCard[] {
  const typeOrder: CardType[] = [
    "Acolyte",
    "Beast",
    "Colossus",
    "Divine Gift",
    "Electric",
    "Fire",
    "Water",
  ];

  return [...hand].sort((a, b) => {
    const aIndex = typeOrder.indexOf(a.type);
    const bIndex = typeOrder.indexOf(b.type);

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    // Same type, sort by title
    return a.title.localeCompare(b.title);
  });
}

export function validateHandLimit(hand: PlayerCard[], phase: string): boolean {
  if (phase === "handbuilding") {
    return hand.length <= 3;
  } else if (phase === "skirmish") {
    return hand.length <= 10;
  }
  return true;
}

export function getTotalPreparedCards(preparedCards: {
  [playerId: string]: PlayerCard[];
}): number {
  return Object.values(preparedCards).reduce(
    (total, playerCards) => total + playerCards.length,
    0,
  );
}

export function canInitiateSkirmish(preparedCards: {
  [playerId: string]: PlayerCard[];
}): boolean {
  return getTotalPreparedCards(preparedCards) >= 8;
}

// Image path utilities
export function getPlayerCardImagePath(card: PlayerCard): string {
  const filename = card.title.toLowerCase().replace(/\s+/g, "-");
  return `/cards/Player Decks/${filename}.png`;
}

export function getEnvironmentImagePath(environmentTitle: string): string {
  const filename = environmentTitle.toLowerCase().replace(/\s+/g, "-");
  return `/cards/Environments/${filename}.png`;
}

export function getItemImagePath(itemTitle: string): string {
  const filename = itemTitle.toLowerCase().replace(/\s+/g, "-");
  return `/cards/Items/${filename}.png`;
}

export function getPlayerCardBackPath(color: string): string {
  return `/cards/Player Decks/player-card-back-${color}.png`;
}
