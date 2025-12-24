import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  GamePhase,
  Player,
  NightAction,
  Vote,
  ChatMessage,
  NightResult,
  DayResult,
  Alignment,
  RoleName,
} from './types';
import { ROLES, assignRoles, REQUIRED_PLAYERS } from './roles';

// Phase durations in milliseconds
const PHASE_DURATIONS = {
  'role-reveal': 8000,      // 8 seconds to see your role
  'night': 30000,           // 30 seconds for night actions
  'day-announcement': 5000, // 5 seconds to show who died
  'day-discussion': 60000,  // 60 seconds for discussion
  'day-voting': 30000,      // 30 seconds to vote
};

export class Game {
  private state: GameState;
  private phaseTimer: NodeJS.Timeout | null = null;
  private onStateChange: (state: GameState) => void;
  private onPhaseEnd: (phase: GamePhase) => void;

  constructor(
    onStateChange: (state: GameState) => void,
    onPhaseEnd: (phase: GamePhase) => void
  ) {
    this.onStateChange = onStateChange;
    this.onPhaseEnd = onPhaseEnd;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'lobby',
      round: 0,
      players: [],
      nightActions: [],
      votes: [],
      dayChat: [],
      mafiaChat: [],
      lastNightResult: null,
      lastDayResult: null,
      winner: null,
      phaseEndTime: null,
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  addPlayer(id: string, name: string, socketId: string): Player | null {
    if (this.state.phase !== 'lobby') return null;
    if (this.state.players.length >= REQUIRED_PLAYERS) return null;
    if (this.state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return null;

    const player: Player = {
      id,
      name,
      socketId,
      isAlive: true,
      isReady: false,
      voteImmune: false,
    };

    this.state.players.push(player);
    this.emitStateChange();
    return player;
  }

  removePlayer(playerId: string): void {
    const index = this.state.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.state.players.splice(index, 1);
      this.emitStateChange();
    }
  }

  updatePlayerSocket(playerId: string, socketId: string): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.socketId = socketId;
    }
  }

  setPlayerReady(playerId: string, isReady: boolean): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (player && this.state.phase === 'lobby') {
      player.isReady = isReady;
      this.emitStateChange();
    }
  }

  canStart(): boolean {
    return (
      this.state.phase === 'lobby' &&
      this.state.players.length === REQUIRED_PLAYERS &&
      this.state.players.every(p => p.isReady)
    );
  }

  start(): boolean {
    if (!this.canStart()) return false;

    // Assign roles
    const playerIds = this.state.players.map(p => p.id);
    const roleAssignments = assignRoles(playerIds);

    this.state.players.forEach(player => {
      player.role = roleAssignments.get(player.id);
    });

    this.state.round = 1;
    this.transitionToPhase('role-reveal');
    return true;
  }

  private transitionToPhase(phase: GamePhase): void {
    // Clear any existing timer
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    this.state.phase = phase;
    const duration = PHASE_DURATIONS[phase as keyof typeof PHASE_DURATIONS];

    if (duration) {
      this.state.phaseEndTime = Date.now() + duration;
      this.phaseTimer = setTimeout(() => this.handlePhaseEnd(), duration);
    } else {
      this.state.phaseEndTime = null;
    }

    // Reset phase-specific data
    if (phase === 'night') {
      this.state.nightActions = [];
      // Reset vote immunity at start of night
      this.state.players.forEach(p => p.voteImmune = false);
    } else if (phase === 'day-voting') {
      this.state.votes = [];
    }

    this.emitStateChange();
  }

  private handlePhaseEnd(): void {
    const currentPhase = this.state.phase;
    this.onPhaseEnd(currentPhase);

    switch (currentPhase) {
      case 'role-reveal':
        this.transitionToPhase('night');
        break;
      case 'night':
        this.resolveNight();
        break;
      case 'day-announcement':
        if (this.state.winner) {
          this.transitionToPhase('game-over');
        } else {
          this.transitionToPhase('day-discussion');
        }
        break;
      case 'day-discussion':
        this.transitionToPhase('day-voting');
        break;
      case 'day-voting':
        this.resolveVoting();
        break;
    }
  }

  submitNightAction(action: NightAction): boolean {
    if (this.state.phase !== 'night') return false;

    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player || !player.isAlive || !player.role) return false;

    const role = ROLES[player.role];
    if (!role.nightAction) return false;

    // Validate action type matches role
    const validActions: Record<RoleName, string> = {
      mafia: 'kill',
      escort: 'escort',
      doctor: 'heal',
      detective: 'investigate',
      citizen: '',
    };

    if (validActions[player.role] !== action.action) return false;

    // Remove any existing action from this player
    this.state.nightActions = this.state.nightActions.filter(
      a => a.playerId !== action.playerId
    );

    this.state.nightActions.push(action);
    this.emitStateChange();
    return true;
  }

  private resolveNight(): void {
    const result: NightResult = {
      killedPlayerId: null,
      savedByDoctor: false,
      detectiveResult: undefined,
      escortedPlayerId: null,
    };

    // Find all actions
    const escortAction = this.state.nightActions.find(a => a.action === 'escort');
    const healAction = this.state.nightActions.find(a => a.action === 'heal');
    const investigateAction = this.state.nightActions.find(a => a.action === 'investigate');
    const killActions = this.state.nightActions.filter(a => a.action === 'kill');

    // 1. Escort visits target - they gain vote immunity
    if (escortAction) {
      const target = this.state.players.find(p => p.id === escortAction.targetId);
      if (target && target.isAlive) {
        target.voteImmune = true;
        result.escortedPlayerId = target.id;
      }
    }

    // 2. Detective investigates
    if (investigateAction) {
      const target = this.state.players.find(p => p.id === investigateAction.targetId);
      if (target && target.role) {
        result.detectiveResult = {
          targetId: target.id,
          alignment: ROLES[target.role].alignment,
        };
      }
    }

    // 3. Mafia kills (majority vote among mafia)
    if (killActions.length > 0) {
      // Count votes for each target
      const killVotes: Record<string, number> = {};
      killActions.forEach(action => {
        killVotes[action.targetId] = (killVotes[action.targetId] || 0) + 1;
      });

      // Find target with most votes
      let maxVotes = 0;
      let killTarget: string | null = null;
      Object.entries(killVotes).forEach(([targetId, votes]) => {
        if (votes > maxVotes) {
          maxVotes = votes;
          killTarget = targetId;
        }
      });

      if (killTarget) {
        // Check if doctor saved
        const wasSaved = healAction && healAction.targetId === killTarget;

        if (wasSaved) {
          result.savedByDoctor = true;
        } else {
          // Kill the player
          const target = this.state.players.find(p => p.id === killTarget);
          if (target) {
            target.isAlive = false;
            result.killedPlayerId = target.id;
          }
        }
      }
    }

    this.state.lastNightResult = result;
    this.state.round++;

    // Check win condition
    this.checkWinCondition();

    this.transitionToPhase('day-announcement');
  }

  submitVote(vote: Vote): boolean {
    if (this.state.phase !== 'day-voting') return false;

    const voter = this.state.players.find(p => p.id === vote.voterId);
    if (!voter || !voter.isAlive) return false;

    // Can't vote for immune players
    if (vote.targetId) {
      const target = this.state.players.find(p => p.id === vote.targetId);
      if (!target || !target.isAlive || target.voteImmune) return false;
    }

    // Remove any existing vote from this player
    this.state.votes = this.state.votes.filter(v => v.voterId !== vote.voterId);
    this.state.votes.push(vote);
    this.emitStateChange();
    return true;
  }

  private resolveVoting(): void {
    const result: DayResult = {
      eliminatedPlayerId: null,
      votes: {},
    };

    // Count votes
    const voteCount: Record<string, number> = {};
    const alivePlayers = this.state.players.filter(p => p.isAlive);

    this.state.votes.forEach(vote => {
      result.votes[vote.voterId] = vote.targetId;
      if (vote.targetId) {
        voteCount[vote.targetId] = (voteCount[vote.targetId] || 0) + 1;
      }
    });

    // Find player with most votes (need majority)
    const majority = Math.floor(alivePlayers.length / 2) + 1;
    let maxVotes = 0;
    let eliminatedId: string | null = null;

    Object.entries(voteCount).forEach(([targetId, votes]) => {
      if (votes >= majority && votes > maxVotes) {
        maxVotes = votes;
        eliminatedId = targetId;
      }
    });

    if (eliminatedId) {
      const target = this.state.players.find(p => p.id === eliminatedId);
      if (target) {
        target.isAlive = false;
        result.eliminatedPlayerId = target.id;
      }
    }

    this.state.lastDayResult = result;

    // Check win condition
    this.checkWinCondition();

    if (this.state.winner) {
      this.transitionToPhase('game-over');
    } else {
      this.transitionToPhase('night');
    }
  }

  private checkWinCondition(): void {
    const alivePlayers = this.state.players.filter(p => p.isAlive);
    const aliveMafia = alivePlayers.filter(p => p.role && ROLES[p.role].alignment === 'mafia');
    const aliveTown = alivePlayers.filter(p => p.role && ROLES[p.role].alignment === 'town');

    if (aliveMafia.length === 0) {
      this.state.winner = 'town';
    } else if (aliveMafia.length >= aliveTown.length) {
      this.state.winner = 'mafia';
    }
  }

  addChatMessage(playerId: string, content: string, isMafiaChat: boolean): ChatMessage | null {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return null;

    // Mafia chat only during night phase and only for mafia
    if (isMafiaChat) {
      if (this.state.phase !== 'night') return null;
      if (!player.role || ROLES[player.role].alignment !== 'mafia') return null;
    } else {
      // Day chat only during day phases
      if (!['day-discussion', 'day-voting'].includes(this.state.phase)) return null;
    }

    const message: ChatMessage = {
      id: uuidv4(),
      playerId,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      isMafiaChat,
    };

    if (isMafiaChat) {
      this.state.mafiaChat.push(message);
    } else {
      this.state.dayChat.push(message);
    }

    return message;
  }

  getPlayerRole(playerId: string): RoleName | undefined {
    const player = this.state.players.find(p => p.id === playerId);
    return player?.role;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  getMafiaPlayers(): Player[] {
    return this.state.players.filter(
      p => p.role && ROLES[p.role].alignment === 'mafia'
    );
  }

  private emitStateChange(): void {
    this.onStateChange(this.getState());
  }

  destroy(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }
  }
}
