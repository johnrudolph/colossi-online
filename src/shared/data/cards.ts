import { PlayerCard, Environment, Item } from "../types/game";
import { v4 as uuidv4 } from "uuid";

// Player card data based on PlayerCards.yml
export const PLAYER_CARD_DATA: Omit<PlayerCard, "id" | "image">[] = [
  // Acolytes (4 copies)
  {
    title: "Acolyte",
    type: "Acolyte",
    power: 2,
    effect:
      "If you have more Acolytes in play than each of your opponents, this card gets +3 power.",
  },
  {
    title: "Acolyte",
    type: "Acolyte",
    power: 2,
    effect:
      "If you have more Acolytes in play than each of your opponents, this card gets +3 power.",
  },
  {
    title: "Acolyte",
    type: "Acolyte",
    power: 2,
    effect:
      "If you have more Acolytes in play than each of your opponents, this card gets +3 power.",
  },
  {
    title: "Acolyte",
    type: "Acolyte",
    power: 2,
    effect:
      "If you have more Acolytes in play than each of your opponents, this card gets +3 power.",
  },

  // Beast cards
  {
    title: "Abduct",
    type: "Beast",
    power: 2,
    effect:
      "Take 1 card that is in play for an opponent, and put it face-down on top of your deck. The card you abducted is now part of your deck. You cannot Abduct an Item.",
  },
  {
    title: "Pillage",
    type: "Beast",
    power: 2,
    effect:
      "Choose a card type. Each of your opponents must discard a card of that type from their hand, or discard 2 cards from their hand of types other than the type you chose.",
  },
  {
    title: "Rampage",
    type: "Beast",
    power: 2,
    effect:
      "All of your opponents must discard cards from their hand until their hand size is equal to your hand size.",
  },

  // Colossus cards
  {
    title: "Bluff",
    type: "Colossus",
    power: 4,
    effect:
      "If this card is in play when scoring a Skirmish, you may move it face-down to another Environment instead of scoring it.",
  },
  {
    title: "Channel Power",
    type: "Colossus",
    power: "?",
    effect:
      "Find your opponent who has the most cards in play here. This card's power is equal to the number of cards that opponent has in play here. This card's power changes as opponents play more cards.",
  },
  {
    title: "Curse",
    type: "Colossus",
    power: -3,
    effect:
      "When you play this card, you may play it in front of an opponent instead of playing it for yourself. It is in play for them, and becomes part of their deck.",
  },
  {
    title: "Heap",
    type: "Colossus",
    power: 0,
    effect:
      "Choose any amount of cards from your hand and from your cards in play here, and tuck them face-down under this card. The cards you chose are no longer in play. For each card you tucked, this card gains +2 Power.",
  },
  {
    title: "Manifest",
    type: "Colossus",
    power: 1,
    effect:
      "Immediately play another card from your hand, even if you are not allowed to play that card right now.",
  },

  // Divine Gift cards
  {
    title: "Companionship",
    type: "Divine Gift",
    power: 0,
    effect: "Draw 2 cards from your deck.",
  },
  {
    title: "Extrication",
    type: "Divine Gift",
    power: 0,
    effect: "Choose 1 card that is in play for you and return it to your hand.",
  },
  {
    title: "Foresight",
    type: "Divine Gift",
    power: 0,
    effect:
      "Look at the top 4 cards from your deck. Add 1 of them in your hand, and return the other 3 to the top of your deck in any order you choose.",
  },
  {
    title: "Replacements",
    type: "Divine Gift",
    power: 0,
    effect:
      "Discard as many cards from your hand as you want. Then draw 1 card from your deck for every card you discarded.",
  },
  {
    title: "Solidarity",
    type: "Divine Gift",
    power: 0,
    effect:
      "Choose 1 of the other Environments. Pick up all the cards you've prepared there, and add them to your hand.",
  },

  // Electric cards
  {
    title: "Spark",
    type: "Electric",
    power: 1,
    effect:
      "When anyone plays a DIVINE GIFT, before they resolve its effect: they must discard 1 card from their hand or from the cards they have in play for each ELECTRIC card in play here.",
  },
  {
    title: "Bolt",
    type: "Electric",
    power: 4,
    effect:
      "When anyone plays a DIVINE GIFT, before they resolve its effect: they must discard 1 card from their hand or from the cards they have in play for each ELECTRIC card in play here.",
  },

  // Fire cards
  {
    title: "Flame",
    type: "Fire",
    power: 6,
    effect: "When this card is in play, no one can play a BEAST card here.",
  },
  {
    title: "Inferno",
    type: "Fire",
    power: 10,
    effect: "When this card is in play, no one can play a BEAST card here.",
  },

  // Water cards
  {
    title: "Droplet",
    type: "Water",
    power: 1,
    effect:
      "When this card is in play, it gives +2 Power to all ELECTRIC cards and -2 Power to all FIRE cards (card Power cannot go below 0).",
  },
  {
    title: "Shower",
    type: "Water",
    power: 3,
    effect:
      "When this card is in play, it gives +2 Power to all ELECTRIC cards and -2 Power to all FIRE cards (card Power cannot go below 0).",
  },
  {
    title: "Downpour",
    type: "Water",
    power: 5,
    effect:
      "When this card is in play, it gives +2 Power to all ELECTRIC cards and -2 Power to all FIRE cards (card Power cannot go below 0).",
  },
];

// Environment data based on Environments.yml
export const ENVIRONMENT_DATA: Omit<Environment, "id">[] = [
  {
    title: "Badlands",
    description:
      "During Skirmishes here: when you play a BEAST card, your opponents must discard 1 extra card. You cannot play FIRE cards here.",
  },
  {
    title: "Blitz Creek",
    description:
      "During Skirmishes here, if you have 25 or more Power in play at the end of your turn, your opponents must discard all the cards in their hands.",
  },
  {
    title: "Cavern",
    description:
      "During Skirmishes here, if you have 5 or more cards in play when your turn starts, you must Pass.",
  },
  {
    title: "Chaos Fissure",
    description:
      "When you prepare a card here during Handbuilding: all opponents must also immediately prepare a card here. Then the player to your left takes their turn as usual. When a Skirmish starts here, shuffle all the cards prepared here together and deal them evenly.",
  },
  {
    title: "Desert",
    description: "During Skirmishes here, you cannot play WATER cards.",
  },
  {
    title: "Glass River",
    description:
      "All cards prepared here must be face-up rather than face-down.",
  },
  {
    title: "Graveyard",
    description:
      "When a Skirmish starts here, before the Initiator plays their first card, everyone searches their discard piles for Acolytes and immediately plays all Acolytes they find.",
  },
  {
    title: "Hallowed Ground",
    description:
      "During Skirmishes here, you can only play WATER, FIRE, and ELECTRIC cards if you have more ACOLYTES in play than your opponents.",
  },
  {
    title: "Impulse Isle",
    description:
      "During Skirmishes here, you will only have 1 turn. On your turn, continue to play cards 1 by 1 and resolve them as you play them until your hand is empty, or until you Pass. On your turn you may still take Items as usual. Beast cards have no effect here.",
  },
  {
    title: "Magnetic Maar",
    description:
      "You can never prepare cards here. At the start of your turn during the Handbuilding phase, if each player has a total of 7 or more cards prepared on the other 2 Environments: everyone must immediately move all their prepared cards here, and you must initiate a Skirmish here.",
  },
  {
    title: "Oasis",
    description:
      "When a Skirmish starts here, before the Initiator plays their first card, draw 3 cards if you have fewer cards prepared on this Environment than all of your opponents.",
  },
  {
    title: "Outskirts",
    description:
      "You may Initiate a Skirmish here, even if there are no cards prepared here. However, you can only Initiate a Skirmish here if an opponent has won more Skirmishes than you.",
  },
  {
    title: "Poison Swamp",
    description:
      "After you prepare a card here in the Handbuilding phase, discard the other 2 cards from your hand, then draw back up to 3 cards.",
  },
  {
    title: "Sacrifice Mountain",
    description:
      "At the start of your first turn during Skirmishes here: choose 2 cards from your hand and put them on the top of any opponent's deck. Those cards are now part of their deck.",
  },
  {
    title: "Stockpile Steppe",
    description:
      "When this is drawn, place 3 Items face-down here. When a Skirmish starts here, flip all 3 Items face-up.",
  },
  {
    title: "The Brink",
    description:
      "When preparing a card here during the Handbuilding phase, you must immediately prepare all 3 cards from your hand here, and draw 3 cards from your deck. Then, discard 1 card that an opponent has prepared here.",
  },
  {
    title: "The Sticks",
    description:
      "Every time you play a FIRE card here during a Skirmish, discard 1 card in play here that is not a FIRE card.",
  },
  {
    title: "Volcano",
    description:
      "After passing during Skirmishes here, discard all cards remaining in your hand instead of moving those cards to other Environments.",
  },
  {
    title: "Zenith",
    description:
      "When a Skirmish starts here: draw 3 cards if you are 2 or more Skirmishes away from winning the game. There is no hand limit here.",
  },
];

// Item data based on Items.yml
export const ITEM_DATA: Omit<Item, "id">[] = [
  // Perk Items
  {
    title: "Boiler",
    type: "Perk",
    description:
      "WATER cards here give your FIRE cards here +2 instead of -2 Power.",
    discard_cost: 1,
  },
  {
    title: "Colossus Coil",
    type: "Perk",
    description: "+2 Power for all of your ELECTRIC cards here.",
    discard_cost: 1,
  },
  {
    title: "Divine Icon",
    type: "Perk",
    description: "+1 Power for all of your DIVINE GIFT cards here.",
    discard_cost: 1,
  },
  {
    title: "Ebenezer",
    type: "Perk",
    description: "Discard your entire hand. This card gives you +10 Power.",
    discard_cost: "?",
  },
  {
    title: "Edible Carnage",
    type: "Perk",
    description: "+2 Power for all of your BEAST cards here.",
    discard_cost: 1,
  },
  {
    title: "Oil",
    type: "Perk",
    description: "+2 Power for all of your FIRE cards here.",
    discard_cost: 1,
  },
  {
    title: "Orb",
    type: "Perk",
    description: "+2 Power for all of your COLOSSUS cards here.",
    discard_cost: 1,
  },
  {
    title: "Pointier Sticks",
    type: "Perk",
    description: "+2 Power for all of your ACOLYTE cards here.",
    discard_cost: 1,
  },
  {
    title: "Turbine",
    type: "Perk",
    description: "+2 Power for all of your WATER cards here.",
    discard_cost: 1,
  },
  {
    title: "Wager",
    type: "Perk",
    description:
      "Guess aloud who will win this Skirmish. If you are correct: draw 2 cards from your deck and prepare them on the next Environment drawn. If you are wrong, discard all of your prepared cards everywhere.",
    discard_cost: 0,
  },

  // Discard Items
  {
    title: "Alms",
    type: "Discard",
    description:
      "If you discarded the last card in your hand to take this, draw 3 cards. Otherwise, draw nothing.",
    discard_cost: 1,
  },
  {
    title: "Cache",
    type: "Discard",
    description:
      "Pass, and flip up to 3 of your cards in play here face-down. Those cards are no longer in play, and are prepared for the next Environment drawn here.",
    discard_cost: 1,
  },
  {
    title: "Caravan",
    type: "Discard",
    description:
      "Move up to 3 of your cards in play here to other Environments.",
    discard_cost: 1,
  },
  {
    title: "Cloak",
    type: "Discard",
    description:
      "Place a card face-down here, and do not reveal it until scoring. It is not in play until you reveal it. If you reveal a WATER, FIRE, ELECTRIC, or ACOLYTE card, include it when scoring this Skirmish. Otherwise, discard it and do not resolve its effect.",
    discard_cost: 0,
  },
  {
    title: "Cyclone",
    type: "Discard",
    description:
      "Pick up all Items on all Environments and put each of them on any of the 3 Environments (each Environment can still only have a maximum of 3 Items).",
    discard_cost: 0,
  },
  {
    title: "Dice",
    type: "Discard",
    description:
      "Draw a random card from the middle of your deck and show it to everyone. If it is a DIVINE GIFT, ACOLYTE, or COLOSSUS, keep it in your hand and draw 2 more cards. Otherwise, discard your entire hand (including the new card you drew).",
    discard_cost: 0,
  },
  {
    title: "Divine Mirror",
    type: "Discard",
    description:
      "Copy the effect of any DIVINE GIFT in play here. Ignore any ELECTRIC cards in play when you do this.",
    discard_cost: 1,
  },
  {
    title: "Divine Totem",
    type: "Discard",
    description:
      "Immediately play a DIVINE GIFT from your hand, and resolve its effect twice.",
    discard_cost: 1,
  },
  {
    title: "Hatchet",
    type: "Discard",
    description:
      "Discard 1 Item on any Environment, or 1 Perk Item that is already in play for another player.",
    discard_cost: 0,
  },
  {
    title: "Lockpick",
    type: "Discard",
    description:
      "Look at the top card of each players' deck. Place 1 of them on top of your deck, and return any others to the decks they came from.",
    discard_cost: 2,
  },
  {
    title: "Looking Glass",
    type: "Discard",
    description: "Choose an opponent. They must show their entire hand to you.",
    discard_cost: 1,
  },
  {
    title: "Loot Chest",
    type: "Discard",
    description:
      "Draw 3 Items. You may immediately play any of these items for free if it has a discard cost of 0 or 1. Discard any of the 3 Items you don't play.",
    discard_cost: 1,
  },
  {
    title: "Magnet",
    type: "Discard",
    description:
      "Take an Item from 1 of the other 2 Environments and play it here immediately (you must still pay its discard cost).",
    discard_cost: 0,
  },
  {
    title: "Olive Branch",
    type: "Discard",
    description:
      "For each Beast card you discarded to take this, draw 2 cards.",
    discard_cost: 2,
  },
  {
    title: "Poison Pill",
    type: "Discard",
    description:
      "Discard any number of cards from your hand (must be more than 0). Each of your opponents must immediately discard the same number of cards from their hands.",
    discard_cost: "?",
  },
  {
    title: "Rallying Banner",
    type: "Discard",
    description:
      "Search your deck for an ACOLYTE. If you find one, play it immediately (limit to just 1 ACOLYTE). Shuffle your deck.",
    discard_cost: 1,
  },
  {
    title: "Recycler",
    type: "Discard",
    description:
      "Choose an Item from the Item discard pile that has a discard cost of 0 or 1. Play it immediately for free.",
    discard_cost: 1,
  },
  {
    title: "Secret Tunnel Keys",
    type: "Discard",
    description:
      "Immediately play a BEAST card, even if there are FIRE cards in play here.",
    discard_cost: 1,
  },
  {
    title: "Shrine",
    type: "Discard",
    description:
      "Choose 1 card from your discard pile and prepare it on either of the other 2 Environments.",
    discard_cost: 1,
  },
  {
    title: "Terraformer",
    type: "Discard",
    description:
      "Discard both of the non-active Environments where you are not currently Skirmishing, and replace them with the top Environments from the deck. Any Items should remain on the next Environments drawn.",
    discard_cost: 1,
  },
];

// Player colors for different decks
export const PLAYER_COLORS = ["black", "brown", "tan", "white"] as const;

// Utility functions
export function createPlayerDeck(): PlayerCard[] {
  return PLAYER_CARD_DATA.map((cardData) => ({
    ...cardData,
    id: uuidv4(),
    image: `/cards/Player Decks/${cardData.title.toLowerCase().replace(/\s+/g, "-")}.png`,
  }));
}

export function createEnvironmentDeck(): Environment[] {
  return ENVIRONMENT_DATA.map((envData) => ({
    ...envData,
    id: uuidv4(),
    image: `/cards/Environments/${envData.title.toLowerCase().replace(/\s+/g, "-")}.png`,
  }));
}

export function createItemDeck(): Item[] {
  return ITEM_DATA.map((itemData) => ({
    ...itemData,
    id: uuidv4(),
    image: `/cards/Items/${itemData.title.toLowerCase().replace(/\s+/g, "-")}.png`,
  }));
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getCardImagePath(card: PlayerCard): string {
  const filename = card.title.toLowerCase().replace(/\s+/g, "-");
  return `/cards/Player Decks/${filename}.png`;
}

export function getPlayerCardBackPath(color: string): string {
  return `/cards/Player Decks/player-card-back-${color}.png`;
}
