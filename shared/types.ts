// Game Status
export enum GameStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

// Team Types
export enum TeamType {
  GOOD = 'GOOD',
  EVIL = 'EVIL',
}

// Round Status
export enum RoundStatus {
  SETUP = 'SETUP',
  PROMPTING = 'PROMPTING',
  GENERATING = 'GENERATING',
  VOTING = 'VOTING',
  COMPLETE = 'COMPLETE',
}

// Core Types
export interface Game {
  id: string;
  code: string;
  hostName: string;
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  players?: Player[];
  rounds?: Round[];
}

export interface Player {
  id: string;
  gameId: string;
  name: string;
  team: TeamType;
  score: number;
  isHost: boolean;
  joinedAt: Date;
}

export interface Round {
  id: string;
  gameId: string;
  roundNumber: number;
  referenceImageUrl: string;
  referencePrompt: string;
  goodPlayerId?: string;
  evilPlayerId?: string;
  status: RoundStatus;
  startedAt?: Date;
  endedAt?: Date;
  winningTeam?: TeamType;
  createdAt: Date;
}

export interface Submission {
  id: string;
  roundId: string;
  playerId: string;
  team: TeamType;
  prompt: string;
  imageUrl?: string;
  generatedAt?: Date;
  createdAt: Date;
}

export interface Vote {
  id: string;
  roundId: string;
  playerId: string;
  votedTeam: TeamType;
  createdAt: Date;
}

// API Request/Response Types
export interface CreateGameRequest {
  hostName: string;
  totalRounds?: number;
}

export interface CreateGameResponse {
  game: {
    id: string;
    code: string;
    qrCodeUrl: string;
    joinUrl: string;
  };
}

export interface JoinGameRequest {
  playerName: string;
}

export interface JoinGameResponse {
  player: Player;
  token: string;
}

export interface SubmitPromptRequest {
  playerId: string;
  prompt: string;
}

export interface VoteRequest {
  playerId: string;
  votedTeam: TeamType;
}

// WebSocket Event Types
export interface PlayerJoinedEvent {
  player: Player;
}

export interface RoundStartedEvent {
  round: {
    id: string;
    roundNumber: number;
    referenceImageUrl: string;
    goodPlayer: Player;
    evilPlayer: Player;
    endsAt: number;
  };
}

export interface VotingStartedEvent {
  submissions: {
    good: {
      imageUrl: string;
      prompt: string;
    };
    evil: {
      imageUrl: string;
      prompt: string;
    };
  };
}

export interface RoundCompletedEvent {
  winner: TeamType;
  scores: {
    good: number;
    evil: number;
  };
}

export interface GameCompletedEvent {
  finalScores: {
    good: number;
    evil: number;
  };
  winner: TeamType;
}
