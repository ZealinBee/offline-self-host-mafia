export type RoleName = 'mafia' | 'escort' | 'doctor' | 'detective' | 'citizen';

export type GamePhase = 'lobby' | 'role-reveal' | 'night' | 'day-announcement' | 'day-discussion' | 'day-voting' | 'game-over';

export type Alignment = 'mafia' | 'town';

export interface Role {
  name: RoleName;
  displayName: string;
  alignment: Alignment;
  description: string;
  nightAction: boolean;
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  role?: RoleName;
  isAlive: boolean;
  isReady: boolean;
  voteImmune: boolean; // Set by escort
}

export interface NightAction {
  playerId: string;
  action: 'kill' | 'escort' | 'heal' | 'investigate';
  targetId: string;
}

export interface Vote {
  voterId: string;
  targetId: string | null; // null = skip
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  isMafiaChat: boolean;
}

export interface NightResult {
  killedPlayerId: string | null;
  savedByDoctor: boolean;
  detectiveResult?: {
    targetId: string;
    alignment: Alignment;
  };
  escortedPlayerId: string | null;
}

export interface DayResult {
  eliminatedPlayerId: string | null;
  votes: Record<string, string | null>; // voterId -> targetId
}

export interface GameState {
  phase: GamePhase;
  round: number;
  players: Player[];
  nightActions: NightAction[];
  votes: Vote[];
  dayChat: ChatMessage[];
  mafiaChat: ChatMessage[];
  lastNightResult: NightResult | null;
  lastDayResult: DayResult | null;
  winner: Alignment | null;
  phaseEndTime: number | null;
}

export interface RoomState {
  code: string;
  createdAt: number;
  game: GameState;
}

// Socket events
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:error': (message: string) => void;
  'game:phase-change': (phase: GamePhase, endTime: number | null) => void;
  'game:role-assigned': (role: RoleName) => void;
  'game:night-result': (result: NightResult) => void;
  'game:day-result': (result: DayResult) => void;
  'game:player-died': (playerId: string, role: RoleName) => void;
  'game:winner': (winner: Alignment) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:mafia-message': (message: ChatMessage) => void;
  'detective:result': (targetId: string, alignment: Alignment) => void;
}

export interface ClientToServerEvents {
  'room:create': (playerName: string, callback: (code: string | null, error?: string) => void) => void;
  'room:join': (code: string, playerName: string, callback: (success: boolean, error?: string) => void) => void;
  'room:leave': () => void;
  'player:ready': (isReady: boolean) => void;
  'game:start': () => void;
  'game:night-action': (action: NightAction) => void;
  'game:vote': (targetId: string | null) => void;
  'chat:send': (content: string) => void;
  'chat:mafia-send': (content: string) => void;
}
