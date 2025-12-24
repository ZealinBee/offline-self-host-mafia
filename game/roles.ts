import { Role, RoleName } from './types';

export const ROLES: Record<RoleName, Role> = {
  mafia: {
    name: 'mafia',
    displayName: 'Mafia',
    alignment: 'mafia',
    description: 'Kill one player each night. Win when mafia equals or outnumbers town.',
    nightAction: true,
  },
  escort: {
    name: 'escort',
    displayName: 'Escort',
    alignment: 'town',
    description: 'Visit a player at night. They cannot be voted out the next day.',
    nightAction: true,
  },
  doctor: {
    name: 'doctor',
    displayName: 'Doctor',
    alignment: 'town',
    description: 'Save one player from death each night.',
    nightAction: true,
  },
  detective: {
    name: 'detective',
    displayName: 'Detective',
    alignment: 'town',
    description: 'Investigate one player each night to learn their alignment.',
    nightAction: true,
  },
  citizen: {
    name: 'citizen',
    displayName: 'Citizen',
    alignment: 'town',
    description: 'No special ability. Use your vote wisely during the day.',
    nightAction: false,
  },
};

// Role distribution for 7 players
export const ROLE_DISTRIBUTION: RoleName[] = [
  'mafia',
  'mafia',
  'escort',
  'doctor',
  'detective',
  'citizen',
  'citizen',
];

export const REQUIRED_PLAYERS = 7;

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function assignRoles(playerIds: string[]): Map<string, RoleName> {
  if (playerIds.length !== REQUIRED_PLAYERS) {
    throw new Error(`Need exactly ${REQUIRED_PLAYERS} players`);
  }

  const shuffledRoles = shuffleArray(ROLE_DISTRIBUTION);
  const assignments = new Map<string, RoleName>();

  playerIds.forEach((playerId, index) => {
    assignments.set(playerId, shuffledRoles[index]);
  });

  return assignments;
}
