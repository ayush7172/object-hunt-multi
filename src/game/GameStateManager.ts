// Game State Manager - handles game phases, timers, win conditions

import { GamePhase, PlayerRole, PlayerState, RoomSettings, RoomState, GameEvent, TransformableObject, Vector3D } from '../utils/types';

export class GameStateManager {
  // Room state
  roomId = '';
  roomState: RoomState | null = null;
  localPlayerId = '';
  isHost = false;
  
  // Game state
  phase: GamePhase = 'lobby';
  phaseTimer = 0;
  gameTimer = 0;
  
  // Players
  players: Map<string, PlayerState> = new Map();
  
  // Objects
  transformableObjects: Map<string, TransformableObject> = new Map();
  
  // Callbacks
  onPhaseChange?: (phase: GamePhase) => void;
  onTimerUpdate?: (phaseTimer: number, gameTimer: number) => void;
  onPlayerUpdate?: (players: PlayerState[]) => void;
  onObjectUpdate?: (objects: TransformableObject[]) => void;
  onGameEvent?: (event: GameEvent) => void;
  onGameOver?: (winner: 'hiders' | 'seekers') => void;
  
  // Settings
  private settings: RoomSettings = {
    mapId: 'house_garden',
    maxPlayers: 8,
    hideMode: 'team',
    hidingTime: 20,
    seekingTime: 180,
    objectTime: 15,
    difficulty: 'normal'
  };

  setRoomState(state: RoomState): void {
    this.roomState = state;
    this.roomId = state.id;
    this.phase = state.phase;
    this.phaseTimer = state.phaseTimer;
    this.gameTimer = state.gameTimer;
    this.settings = state.settings;
    
    // Update players
    this.players.clear();
    Object.values(state.players).forEach(p => this.players.set(p.id, p));
    
    this.onPlayerUpdate?.(Array.from(this.players.values()));
    this.onPhaseChange?.(this.phase);
  }

  setLocalPlayerId(id: string): void {
    this.localPlayerId = id;
    const player = this.players.get(id);
    this.isHost = player?.isHost || false;
  }

  updatePhase(phase: GamePhase, phaseTimer: number): void {
    this.phase = phase;
    this.phaseTimer = phaseTimer;
    this.onPhaseChange?.(phase);
  }

  updateTimer(deltaTime: number): void {
    if (this.phase === 'hiding' || this.phase === 'playing') {
      this.phaseTimer -= deltaTime;
      if (this.phase === 'playing') {
        this.gameTimer -= deltaTime;
      }
      
      if (this.phaseTimer <= 0) {
        this.handlePhaseEnd();
      }
      
      this.onTimerUpdate?.(Math.max(0, this.phaseTimer), Math.max(0, this.gameTimer));
    }
  }

  private handlePhaseEnd(): void {
    if (this.phase === 'hiding') {
      // Transition to seeking phase
      this.phase = 'playing';
      this.phaseTimer = this.settings.seekingTime;
      this.gameTimer = this.settings.seekingTime;
      this.onPhaseChange?.('playing');
      
      // Notify seekers they can now move
      this.emitEvent({
        type: 'phaseChange',
        payload: { phase: 'playing', seekingTime: this.settings.seekingTime },
        timestamp: Date.now(),
        senderId: 'system'
      });
    } else if (this.phase === 'playing') {
      // Time's up - hiders win
      this.endGame('hiders');
    }
  }

  updatePlayerState(playerId: string, updates: Partial<PlayerState>): void {
    const player = this.players.get(playerId);
    if (player) {
      Object.assign(player, updates);
      this.onPlayerUpdate?.(Array.from(this.players.values()));
    }
  }

  updateObjectState(objectId: string, updates: Partial<TransformableObject>): void {
    const obj = this.transformableObjects.get(objectId);
    if (obj) {
      Object.assign(obj, updates);
      this.onObjectUpdate?.(Array.from(this.transformableObjects.values()));
    }
  }

  // Host-only authoritative methods
  initializeGame(settings: RoomSettings, playerIds: string[]): RoomState {
    this.settings = settings;
    this.phase = 'hiding';
    this.phaseTimer = settings.hidingTime;
    this.gameTimer = settings.seekingTime;
    
    // Assign roles
    const numSeekers = Math.max(1, Math.floor(playerIds.length / 4));
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    
    playerIds.forEach((id, index) => {
      const player = this.players.get(id);
      if (player) {
        player.role = index < numSeekers ? 'seeker' : 'hider';
        player.isAlive = true;
        player.health = 100;
        player.objectTimer = 0;
        player.isTransformed = false;
      }
    });
    
    // Reset objects
    this.transformableObjects.forEach(obj => {
      obj.durability = obj.maxDurability;
      obj.hasHider = false;
      obj.hiderId = undefined;
    });
    
    const roomState = this.createRoomState();
    this.onPhaseChange?.('hiding');
    return roomState;
  }

  handleTransform(hiderId: string, objectId: string): boolean {
    const player = this.players.get(hiderId);
    const obj = this.transformableObjects.get(objectId);
    
    if (!player || !obj) return false;
    if (player.role !== 'hider') return false;
    if (!player.isAlive) return false;
    if (player.isTransformed) return false;
    if (!obj.isTransformable) return false;
    if (obj.hasHider) return false;
    
    // Check distance (would need position check)
    // For now, allow
    
    player.isTransformed = true;
    player.transformedObjectId = objectId;
    player.objectTimer = this.settings.objectTime;
    
    obj.hasHider = true;
    obj.hiderId = hiderId;
    
    this.emitEvent({
      type: 'transform',
      payload: { hiderId, objectId, objectTimer: this.settings.objectTime },
      timestamp: Date.now(),
      senderId: hiderId
    });
    
    return true;
  }

  handleUntransform(hiderId: string): boolean {
    const player = this.players.get(hiderId);
    if (!player || !player.isTransformed) return false;
    
    const objectId = player.transformedObjectId;
    const obj = objectId ? this.transformableObjects.get(objectId) : null;
    
    player.isTransformed = false;
    player.transformedObjectId = undefined;
    player.objectTimer = 0;
    
    if (obj) {
      obj.hasHider = false;
      obj.hiderId = undefined;
    }
    
    this.emitEvent({
      type: 'untransform',
      payload: { hiderId, objectId },
      timestamp: Date.now(),
      senderId: hiderId
    });
    
    return true;
  }

  handleHit(seekerId: string, objectId: string): boolean {
    const seeker = this.players.get(seekerId);
    const obj = this.transformableObjects.get(objectId);
    
    if (!seeker || !obj) return false;
    if (seeker.role !== 'seeker') return false;
    if (!seeker.isAlive) return false;
    if (!obj.isTransformable) return false;
    if (obj.meshVisible === false) return false; // Would need to track visibility
    
    // Apply damage
    obj.durability -= 35; // Base damage
    
    let destroyed = false;
    if (obj.durability <= 0) {
      obj.durability = 0;
      destroyed = true;
      obj.meshVisible = false;
      
      // Check if hider was inside
      if (obj.hasHider && obj.hiderId) {
        const hider = this.players.get(obj.hiderId);
        if (hider) {
          hider.isAlive = false;
          hider.isTransformed = false;
          hider.transformedObjectId = undefined;
          hider.health = 0;
          
          obj.hasHider = false;
          obj.hiderId = undefined;
          
          this.emitEvent({
            type: 'playerDeath',
            payload: { playerId: obj.hiderId, killerId: seekerId, cause: 'object_destroyed' },
            timestamp: Date.now(),
            senderId: seekerId
          });
          
          this.checkWinCondition();
        }
      }
    }
    
    this.emitEvent({
      type: 'hit',
      payload: { seekerId, objectId, damage: 35, durability: obj.durability, destroyed },
      timestamp: Date.now(),
      senderId: seekerId
    });
    
    return true;
  }

  handleObjectTimerExpired(hiderId: string): void {
    const player = this.players.get(hiderId);
    if (!player || !player.isTransformed) return;
    
    this.handleUntransform(hiderId);
    
    this.emitEvent({
      type: 'timerSync',
      payload: { hiderId, objectTimer: 0, forced: true },
      timestamp: Date.now(),
      senderId: 'system'
    });
  }

  private checkWinCondition(): void {
    const aliveHiders = Array.from(this.players.values()).filter(p => p.role === 'hider' && p.isAlive);
    const aliveSeekers = Array.from(this.players.values()).filter(p => p.role === 'seeker' && p.isAlive);
    
    if (aliveHiders.length === 0) {
      this.endGame('seekers');
    } else if (aliveSeekers.length === 0) {
      this.endGame('hiders');
    }
  }

  endGame(winner: 'hiders' | 'seekers'): void {
    this.phase = 'gameover';
    this.onGameOver?.(winner);
    
    this.emitEvent({
      type: 'phaseChange',
      payload: { phase: 'gameover', winner },
      timestamp: Date.now(),
      senderId: 'system'
    });
  }

  private createRoomState(): RoomState {
    return {
      id: this.roomId,
      hostId: this.getHostId() || '',
      settings: this.settings,
      phase: this.phase,
      players: Object.fromEntries(this.players),
      phaseTimer: this.phaseTimer,
      gameTimer: this.gameTimer,
      createdAt: Date.now()
    };
  }

  private getHostId(): string | null {
    for (const [id, player] of this.players) {
      if (player.isHost) return id;
    }
    return null;
  }

  private emitEvent(event: GameEvent): void {
    this.onGameEvent?.(event);
  }

  // Getters
  getLocalPlayer(): PlayerState | undefined {
    return this.players.get(this.localPlayerId);
  }

  getPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  getAlivePlayers(role?: PlayerRole): PlayerState[] {
    return Array.from(this.players.values()).filter(p => 
      p.isAlive && (!role || p.role === role)
    );
  }

  getTransformableObjects(): TransformableObject[] {
    return Array.from(this.transformableObjects.values());
  }

  getSettings(): RoomSettings {
    return { ...this.settings };
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getPhaseTimer(): number {
    return this.phaseTimer;
  }

  getGameTimer(): number {
    return this.gameTimer;
  }
}