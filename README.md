# Colossi Online - Card Game

A real-time multiplayer card game built with Next.js, TypeScript, WebSockets, and SQLite. This project demonstrates modern full-stack development with shared game logic between client and server.

## 🚀 Features

- **Real-time Multiplayer**: WebSocket-powered game sessions with instant updates
- **Shared Game Logic**: Same game engine runs on both client and server
- **Type-Safe**: Full TypeScript implementation with strict typing
- **Modern Stack**: Next.js 15, React 19, Socket.io, Prisma, TailwindCSS
- **Database Persistence**: SQLite database for game state persistence
- **Responsive UI**: Mobile-friendly game interface

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Socket.io
- **Database**: SQLite with Prisma ORM
- **Real-time**: Socket.io for WebSocket connections
- **Validation**: Zod for runtime type checking

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   └── page.tsx           # Main game interface
├── hooks/                 # React hooks
│   └── useGameSocket.ts   # WebSocket game connection hook
├── pages/api/             # API routes
│   └── socket.ts          # WebSocket server initialization
├── server/                # Server-side logic
│   └── socketServer.ts    # Socket.io game server
├── shared/                # Shared client/server code
│   ├── game/
│   │   └── GameEngine.ts  # Core game logic
│   ├── types/
│   │   └── game.ts        # TypeScript interfaces
│   └── utils/
│       └── cards.ts       # Card utility functions
└── generated/             # Prisma generated client
```

## 🎮 Game Rules

This is a basic card game implementation with the following rules:

1. **Setup**: Each player starts with 7 cards
2. **Objective**: Be the first player to play all your cards
3. **Gameplay**: 
   - Players take turns playing cards that match the suit or rank of the top card
   - If no valid play is available, draw a card from the deck
   - Pass turn if unable to play
4. **Winning**: First player to empty their hand wins

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd colossi-online
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 How to Play

1. **Enter your name** on the home screen
2. **Create a new game** or **join an existing game** with a game ID
3. **Wait for other players** to join (2-4 players supported)
4. **Click "Ready Up!"** when you're ready to start
5. **Play cards** by clicking on them during your turn
6. **Draw cards** or **pass turn** using the action buttons
7. **Win** by being the first to play all your cards!

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:reset` - Reset database

### Key Components

#### GameEngine (`src/shared/game/GameEngine.ts`)
The core game logic that runs identically on client and server:
- Manages game state and player actions
- Validates moves and game rules
- Emits events for real-time updates
- Handles game phases (waiting, playing, finished)

#### SocketGameServer (`src/server/socketServer.ts`)
WebSocket server managing game sessions:
- Creates and manages game rooms
- Handles player connections/disconnections
- Processes game actions and broadcasts updates
- Maintains game state persistence

#### useGameSocket Hook (`src/hooks/useGameSocket.ts`)
React hook for WebSocket game integration:
- Manages socket connection state
- Provides game actions (create, join, leave)
- Handles real-time event updates
- Type-safe API for game interactions

## 🏗️ Architecture Highlights

### Shared Logic
The game engine (`GameEngine.ts`) contains all game logic and runs identically on both client and server. This ensures:
- Consistent game behavior
- Reduced code duplication
- Easier testing and maintenance
- Predictable client-side updates

### Real-time Communication
Socket.io provides bidirectional communication:
- **Client → Server**: Game actions (play card, draw card, etc.)
- **Server → Client**: Game state updates, events, errors
- **Room-based**: Players only receive updates for their game

### Type Safety
Full TypeScript implementation with:
- Shared interfaces between client/server
- Strict typing for game actions and state
- Runtime validation with Zod
- Type-safe WebSocket events

## 🔮 Future Enhancements

- [ ] Multiple game variants (Uno, Crazy Eights, etc.)
- [ ] Player authentication and profiles
- [ ] Game history and statistics
- [ ] Spectator mode
- [ ] Private/password-protected games
- [ ] Mobile app with React Native
- [ ] AI opponents
- [ ] Tournament mode
- [ ] Card animations and sound effects
- [ ] Redis for session management (scaling)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by classic card games
- Designed for learning full-stack development patterns# colossi-online
