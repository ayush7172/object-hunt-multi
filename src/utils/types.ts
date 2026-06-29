// Core game types

export type GameMode = 'hide' | 'seek';
export type GamePhase = 'lobby' | 'hiding' | 'playing' | 'gameover';
export type PlayerRole = 'hider' | 'seeker' | 'spectator';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  name: string;
  role: PlayerRole;
  position: Vector3D;
  rotation: Vector3D;
  health: number;
  isTransformed: boolean;
  transformedObjectId?: string;
  objectTimer: number;
  isAlive: boolean;
  isHost: boolean;
}

export interface RoomSettings {
  mapId: string;
  maxPlayers: number;
  hideMode: 'team' | 'solo';
  hidingTime: number;
  seekingTime: number;
  objectTime: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface RoomState {
  id: string;
  hostId: string;
  settings: RoomSettings;
  phase: GamePhase;
  players: Record<string, PlayerState>;
  phaseTimer: number;
  gameTimer: number;
  createdAt: number;
}

export interface TransformableObject {
  id: string;
  name: string;
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  durability: number;
  maxDurability: number;
  isTransformable: boolean;
  hasHider: boolean;
  hiderId?: string;
  meshVisible?: boolean;
}

export interface GameEvent {
  type: 'transform' | 'untransform' | 'hit' | 'destroy' | 'roleAssign' | 'phaseChange' | 'timerSync' | 'playerJoin' | 'playerLeave' | 'playerDeath';
  payload: any;
  timestamp: number;
  senderId: string;
}

export interface MapConfig {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  bounds: { min: Vector3D; max: Vector3D };
  spawnZones: {
    hider: Vector3D[];
    seeker: Vector3D[];
  };
  transformableObjects: TransformableObject[];
  modelPath: string;
  collisionPath?: string;
}

export interface InputState {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  interact: boolean;
  attack: boolean;
  toggleView: boolean;
}

// Network messages
export type NetworkMessage =
  | { type: 'offer'; payload: RTCSessionDescriptionInit; targetId: string }
  | { type: 'answer'; payload: RTCSessionDescriptionInit; targetId: string }
  | { type: 'ice-candidate'; payload: RTCIceCandidateInit; targetId: string }
  | { type: 'game-event'; payload: GameEvent }
  | { type: 'player-state'; payload: PlayerState }
  | { type: 'room-state'; payload: RoomState }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number };

export const DIFFICULTY_SETTINGS = {
  easy: { gameTime: 240, objectTime: 20, aiSpeed: 1.5, seekTime: 240 },
  normal: { gameTime: 180, objectTime: 15, aiSpeed: 2.5, seekTime: 180 },
  hard: { gameTime: 120, objectTime: 10, aiSpeed: 3.5, seekTime: 120 }
} as const;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mapId: 'house_garden',
  maxPlayers: 8,
  hideMode: 'team',
  hidingTime: 20,
  seekingTime: 180,
  objectTime: 15,
  difficulty: 'normal'
};