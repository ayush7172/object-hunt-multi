// Main Entry - Object Hunt Multiplayer

import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager';
import { PlayerController } from './player/PlayerController';
import { InputManager } from './player/InputManager';
import { RemotePlayer } from './player/RemotePlayer';
import { GameStateManager } from './game/GameStateManager';
import { NetworkManager } from './network/NetworkManager';
import { AudioManager } from './audio/AudioManager';
import { UIManager } from './ui/UIManager';
import { MapLoader } from './maps/MapLoader';
import { getMapForPlayerCount, getMapById } from './maps/MapConfig';
import { RoomSettings, PlayerState, GameEvent, GamePhase } from './utils/types';

// ========== FIREBASE CONFIG ==========
// Uses Vite environment variables (set in .env or GitHub Secrets)
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

function isFirebaseConfigured(): boolean {
  return FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' && FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT';
}

// ========== GAME CLASS ==========
class ObjectHuntGame {
  // Core
  private canvas!: HTMLCanvasElement;
  private sceneManager!: SceneManager;
  private playerController!: PlayerController;
  private inputManager!: InputManager;
  private gameState: GameStateManager;
  private network: NetworkManager;
  private audio: AudioManager;
  private ui: UIManager;
  private mapLoader!: MapLoader;

  // Remote players
  private remotePlayers: Map<string, RemotePlayer> = new Map();

  // Game state
  private isRunning = false;
  private isPaused = false;
  private localId = '';
  private phase: GamePhase = 'lobby';
  private phaseTimer = 0;
  private gameTimer = 0;
  private objectTimer = 0;
  private objectTimerMax = 15;
  private isTransformed = false;
  private transformedObjectId = '';
  private highlightedObjectId = '';
  private playerHealth = 100;
  private localRole: 'hider' | 'seeker' | 'spectator' = 'hider';

  // Weapon
  private weaponMesh: THREE.Group | null = null;
  private weaponSwing = 0;

  // Position sync
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime = 0;
  private syncRate = 1000 / 20; // 20 Hz position sync

  constructor() {
    this.gameState = new GameStateManager();
    this.network = new NetworkManager();
    this.audio = new AudioManager();
    this.ui = new UIManager();
  }

  async init(): Promise<void> {
    // Show loading
    this.ui.showLoading();

    try {
      // Create canvas
      this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        document.body.prepend(this.canvas);
      }

      // Init systems
      this.sceneManager = new SceneManager(this.canvas);
      this.inputManager = new InputManager(this.canvas, this.ui.isMobileDevice());
      this.mapLoader = new MapLoader(this.sceneManager.scene);
      this.playerController = new PlayerController(this.sceneManager, this.inputManager);

      // Init audio on first interaction
      document.addEventListener('click', () => this.audio.init(), { once: true });
      document.addEventListener('touchstart', () => this.audio.init(), { once: true });

      // Setup input callbacks
      this.inputManager.onInteract = () => this.handleInteract();
      this.inputManager.onAttack = () => this.handleAttack();
      this.inputManager.onJump = () => {}; // Handled in PlayerController.update
      this.inputManager.onToggleView = () => this.playerController.toggleThirdPerson();
      this.inputManager.onPause = () => this.handlePause();

      this.inputManager.onTouchLook = (dx, dy) => {
        this.playerController.handleTouchLook(dx, dy);
      };

      document.addEventListener('mousemove', (e) => {
        if (this.inputManager.isPointerLocked()) {
          this.playerController.handleMouseMove(e.movementX, e.movementY);
        }
      });

      // Setup network callbacks
      this.network.onRoomStateChange = (state) => {
        if (state) {
          this.gameState.setRoomState(state);
          this.localId = this.network.getLocalId();
          this.gameState.setLocalPlayerId(this.localId);
          this.handleRoomUpdate();
        }
      };

      this.network.onGameEvent = (event) => this.handleGameEvent(event);
      this.network.onConnected = (peerId) => this.handlePeerConnected(peerId);
      this.network.onDisconnected = (peerId) => this.handlePeerDisconnected(peerId);
      this.network.onError = (error) => this.ui.showMessage(error, '#f44336');

      // Setup UI callbacks
      this.ui.onCreateRoom = (settings) => this.createRoom(settings);
      this.ui.onJoinRoom = (code) => this.joinRoom(code);
      this.ui.onStartGame = () => this.startGame();
      this.ui.onLeaveRoom = () => this.leaveRoom();

      // Handle window resize
      window.addEventListener('resize', () => this.sceneManager.resize());

      // Show main menu
      this.ui.hideLoading();
      this.ui.showMainMenu();

      // Warn if Firebase not configured
      if (!isFirebaseConfigured()) {
        this.ui.showMessage('Firebase not configured — set GitHub Secrets in repo settings', '#FF9800', 10000);
      }

      // Start render loop
      this.isRunning = true;
      this.animate();
    } catch (e) {
      console.error('Game init failed:', e);
      this.ui.hideLoading();
      this.ui.showMessage(`Failed to load: ${e instanceof Error ? e.message : 'Unknown error'}`, '#f44336', 10000);
    }
  }

  // ========== ROOM MANAGEMENT ==========
  private async createRoom(settings: RoomSettings): Promise<void> {
    if (!isFirebaseConfigured()) {
      this.ui.showMessage('Firebase not configured. Add secrets to GitHub repo settings.', '#f44336', 8000);
      return;
    }
    try {
      this.localId = await this.network.initialize(FIREBASE_CONFIG);
      const roomCode = await this.network.createRoom(settings);
      this.ui.showLobby(roomCode, [], true);
    } catch (e: any) {
      this.ui.showMessage(`Failed to create room: ${e.message}`, '#f44336');
    }
  }

  private async joinRoom(code: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      this.ui.showMessage('Firebase not configured. Add secrets to GitHub repo settings.', '#f44336', 8000);
      return;
    }
    try {
      this.localId = await this.network.initialize(FIREBASE_CONFIG);
      const success = await this.network.joinRoom(code);
      if (success) {
        this.ui.showMessage('Joined room!', '#4CAF50');
      }
    } catch (e: any) {
      this.ui.showMessage(`Failed to join: ${e.message}`, '#f44336');
    }
  }

  private async startGame(): Promise<void> {
    if (!this.network.isHostPlayer()) {
      console.warn('Not host, cannot start game');
      return;
    }

    console.log('Starting game...');
    const settings = this.gameState.getSettings();
    const playerCount = this.gameState.getPlayers().length;
    const mapConfig = getMapForPlayerCount(playerCount);
    settings.mapId = mapConfig.id;

    try {
      await this.network.startGame(settings);
      console.log('Game start sent to Firebase');

      // Host: also start locally without waiting for listener
      // (listener should also trigger beginGameplay)
      setTimeout(() => {
        if (this.phase === 'lobby') {
          console.log('Starting gameplay locally (fallback)');
          this.phase = 'hiding';
          this.beginGameplay(settings.mapId);
        }
      }, 1000);
    } catch (e: any) {
      console.error('Failed to start game:', e);
      this.ui.showMessage(`Failed: ${e.message}`, '#f44336');
    }
  }

  private beginGameplay(mapId: string): void {
    // Load the map
    const mapConfig = getMapById(mapId);
    this.mapLoader.loadMap(mapConfig);

    // Setup map loader's ground meshes for the scene manager
    // (MapLoader already adds to scene)

    // Position local player at first hider spawn
    const spawns = mapConfig.spawnZones.hider;
    const spawn = spawns[0] || { x: 0, y: 1.6, z: 0 };
    this.playerController.spawn(
      new THREE.Vector3(spawn.x, 1.6, spawn.z),
      0
    );

    // Load transformable objects from map into game state
    const objects = this.mapLoader.getTransformableObjects();
    this.gameState.transformableObjects.clear();

    // Find all transformable objects in the map
    const worldGroup = this.mapLoader.getWorldGroup();
    worldGroup.traverse((child) => {
      if (child instanceof THREE.Group && child.userData.transformable) {
        this.gameState.transformableObjects.set(child.userData.name, {
          id: child.userData.name,
          name: child.userData.name,
          position: { x: child.position.x, y: child.position.y, z: child.position.z },
          rotation: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z },
          scale: { x: 1, y: 1, z: 1 },
          durability: 100,
          maxDurability: 100,
          isTransformable: true,
          hasHider: false,
        });
      }
    });

    // Show HUD
    this.ui.showHUD();
    this.ui.updateHUDMode(this.localRole as 'hide' | 'seek');

    // Determine phase
    const localPlayer = this.gameState.getLocalPlayer();
    if (localPlayer) {
      this.localRole = localPlayer.role;
      this.playerHealth = localPlayer.health;
      this.ui.updateHUDMode(localPlayer.role === 'seeker' ? 'seek' : 'hide');
    }

    // Start hiding phase
    this.phase = 'hiding';
    this.gameState.updatePhase('hiding', this.gameState.getSettings().hidingTime);
    this.ui.updatePhase('hiding');

    // Seekers get frozen during hiding phase
    if (this.localRole === 'seeker') {
      this.ui.showMessage('Hiders are hiding...', '#FF9800', 5000);
    } else {
      this.ui.showMessage('Find a hiding spot! Press E on objects to disguise!', '#4CAF50', 5000);
    }

    this.isRunning = true;
  }

  private async leaveRoom(): Promise<void> {
    await this.network.leaveRoom();
    this.remotePlayers.forEach(rp => rp.dispose(this.sceneManager.scene));
    this.remotePlayers.clear();
    this.ui.showMainMenu();
  }

  // ========== GAME FLOW ==========
  private handleRoomUpdate(): void {
    const state = this.gameState.roomState;
    if (!state) return;

    const players = this.gameState.getPlayers();
    const isHost = this.network.isHostPlayer();
    const roomId = this.network.getRoomId();

    // Check if game just started (phase changed from lobby)
    const newPhase = state.phase;
    if (newPhase === 'hiding' && this.phase === 'lobby') {
      // Game is starting!
      this.phase = 'hiding';
      this.beginGameplay(state.settings.mapId);
      return;
    }

    // Still in lobby
    if (newPhase === 'lobby') {
      this.ui.showLobby(roomId, players, isHost, state.settings.maxPlayers);
    }

    // Update roles
    const localPlayer = this.gameState.getLocalPlayer();
    if (localPlayer) {
      this.localRole = localPlayer.role;
    }

    // Sync remote players
    this.syncRemotePlayers(players);
  }

  private syncRemotePlayers(players: PlayerState[]): void {
    const existingIds = new Set(this.remotePlayers.keys());
    const newIds = new Set(players.map(p => p.id).filter(id => id !== this.localId));

    // Remove disconnected players
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        const rp = this.remotePlayers.get(id);
        if (rp) rp.dispose(this.sceneManager.scene);
        this.remotePlayers.delete(id);
      }
    });

    // Add new players
    newIds.forEach(id => {
      if (!this.remotePlayers.has(id)) {
        const player = players.find(p => p.id === id);
        if (player) {
          const rp = new RemotePlayer(player, this.sceneManager.scene);
          this.remotePlayers.set(id, rp);
        }
      }
    });
  }

  private handleGameEvent(event: GameEvent): void {
    switch (event.type) {
      case 'transform':
        this.handleRemoteTransform(event.payload);
        break;
      case 'untransform':
        this.handleRemoteUntransform(event.payload);
        break;
      case 'hit':
        this.handleRemoteHit(event.payload);
        break;
      case 'destroy':
        this.handleRemoteDestroy(event.payload);
        break;
      case 'phaseChange':
        this.handlePhaseChange(event.payload);
        break;
      case 'timerSync':
        this.handleTimerSync(event.payload);
        break;
      case 'playerDeath':
        this.handlePlayerDeath(event.payload);
        break;
    }
  }

  private handleRemoteTransform(payload: any): void {
    const rp = this.remotePlayers.get(payload.hiderId);
    if (rp) {
      rp.setDisguised(true, payload.objectId);
      this.audio.play('transform');
    }
  }

  private handleRemoteUntransform(payload: any): void {
    const rp = this.remotePlayers.get(payload.hiderId);
    if (rp) {
      rp.setDisguised(false);
      this.audio.play('untransform');
    }
  }

  private handleRemoteHit(payload: any): void {
    this.audio.play('hit_wood');
    // Flash effect on the object
    if (payload.destroyed) {
      this.audio.play('hit_metal');
    }
  }

  private handleRemoteDestroy(payload: any): void {
    // Object destroyed animation
    this.audio.play('hit_metal');
  }

  private handlePhaseChange(payload: any): void {
    this.phase = payload.phase;
    this.phaseTimer = payload.phaseTimer || payload.seekingTime || 0;
    this.ui.updatePhase(payload.phase);

    if (payload.phase === 'playing') {
      this.ui.showMessage('Seeker is coming!', '#f44336');
      this.ui.hideHidingPhase();
      this.audio.play('phase_start');
    } else if (payload.phase === 'gameover') {
      this.handleGameOver(payload.winner);
    }
  }

  private handleTimerSync(payload: any): void {
    if (payload.hiderId === this.localId && payload.forced) {
      this.forceUntransform();
      this.ui.showMessage('Disguise expired!', '#FF9800');
    }
  }

  private handlePlayerDeath(payload: any): void {
    if (payload.playerId === this.localId) {
      this.localRole = 'spectator';
      this.ui.showMessage('You have been eliminated!', '#f44336');
      this.ui.showSpectateButton(true);
    }
    const rp = this.remotePlayers.get(payload.playerId);
    if (rp) {
      rp.dispose(this.sceneManager.scene);
      this.remotePlayers.delete(payload.playerId);
    }
  }

  private handleGameOver(winner: 'hiders' | 'seekers'): void {
    this.isRunning = false;
    this.phase = 'gameover';
    this.ui.showGameOver(winner, this.localRole, this.playerHealth > 0);
    const playerWon = (winner === 'hiders' && this.localRole === 'hider') ||
                      (winner === 'seekers' && this.localRole === 'seeker');
    this.audio.play(playerWon ? 'win' : 'lose');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private handlePeerConnected(peerId: string): void {
    this.ui.showMessage('Player connected', '#4CAF50');
  }

  private handlePeerDisconnected(peerId: string): void {
    this.ui.showMessage('Player disconnected', '#FF9800');
    const rp = this.remotePlayers.get(peerId);
    if (rp) {
      rp.dispose(this.sceneManager.scene);
      this.remotePlayers.delete(peerId);
    }
  }

  // ========== PLAYER ACTIONS ==========
  private handleInteract(): void {
    if (this.phase !== 'playing' && this.phase !== 'hiding') return;
    if (this.localRole === 'spectator') return;

    if (this.localRole === 'hider') {
      if (this.isTransformed) {
        this.untransform();
      } else {
        this.transform();
      }
    }
  }

  private handleAttack(): void {
    if (this.phase !== 'playing') return;
    if (this.localRole !== 'seeker') return;

    this.weaponSwing = 1.0;
    this.audio.play('hit_wood');

    // Raycast to find object
    const intersections = this.sceneManager.raycastFromCamera(4);
    if (intersections.length > 0) {
      const hit = intersections[0];
      const object = hit.object;

      // Find the transformable object
      let current = object;
      while (current) {
        if (current.userData?.transformable) {
          const objectId = current.userData.name || current.uuid;
          this.performHit(objectId);
          break;
        }
        current = current.parent!;
      }
    }
  }

  private transform(): void {
    if (this.isTransformed) return;

    const intersections = this.sceneManager.raycastFromCamera(4);
    if (intersections.length > 0) {
      const hit = intersections[0];
      const object = hit.object;

      let current = object;
      while (current) {
        if (current.userData?.transformable) {
          const objectId = current.userData.name || current.uuid;
          this.performTransform(objectId);
          break;
        }
        current = current.parent!;
      }
    }
  }

  private performTransform(objectId: string): void {
    const success = this.gameState.handleTransform(this.localId, objectId);
    if (success) {
      this.isTransformed = true;
      this.transformedObjectId = objectId;
      this.objectTimer = this.objectTimerMax;
      this.playerController.setDisguised(true, objectId);

      this.network.sendGameEvent({
        type: 'transform',
        payload: { hiderId: this.localId, objectId, objectTimer: this.objectTimerMax },
        timestamp: Date.now(),
        senderId: this.localId
      });

      this.audio.play('transform');
      this.ui.showMessage('Transformed!', '#4CAF50');
      this.ui.showTransformButton(true, true);
    }
  }

  private untransform(): void {
    if (!this.isTransformed) return;

    const success = this.gameState.handleUntransform(this.localId);
    if (success) {
      this.isTransformed = false;
      this.transformedObjectId = '';
      this.objectTimer = 0;
      this.playerController.setDisguised(false);

      this.network.sendGameEvent({
        type: 'untransform',
        payload: { hiderId: this.localId },
        timestamp: Date.now(),
        senderId: this.localId
      });

      this.audio.play('untransform');
      this.ui.showTransformButton(true, false);
    }
  }

  private forceUntransform(): void {
    this.isTransformed = false;
    this.transformedObjectId = '';
    this.objectTimer = 0;
    this.playerController.setDisguised(false);
    this.ui.showTransformButton(true, false);
  }

  private performHit(objectId: string): void {
    const success = this.gameState.handleHit(this.localId, objectId);
    if (success) {
      this.network.sendGameEvent({
        type: 'hit',
        payload: { seekerId: this.localId, objectId, damage: 35 },
        timestamp: Date.now(),
        senderId: this.localId
      });
    }
  }

  private handlePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.inputManager.exitPointerLock();
    }
  }

  // ========== GAME LOOP ==========
  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    const dt = Math.min(this.sceneManager.getDeltaTime(), 0.05);

    if (this.isPaused || this.phase === 'lobby') {
      this.sceneManager.render();
      return;
    }

    // Update game state timers
    if (this.phase === 'hiding' || this.phase === 'playing') {
      this.gameState.updateTimer(dt);

      // Update local timers
      if (this.isTransformed && this.objectTimer > 0) {
        this.objectTimer -= dt;
        if (this.objectTimer <= 0) {
          this.forceUntransform();
          this.ui.showMessage('Disguise expired!', '#FF9800');
          this.audio.play('timer_warning');
        }
        this.ui.updateObjectTimer(this.objectTimer, this.objectTimerMax);
      } else {
        this.ui.updateObjectTimer(0, this.objectTimerMax);
      }

      this.ui.updatePhaseTimer(this.gameState.getPhaseTimer());
    }

    // Update player
    this.playerController.update(dt);

    // Update remote players
    this.remotePlayers.forEach(rp => rp.update(dt));

    // Update interaction highlights
    this.updateInteraction();

    // Update HUD
    this.ui.updateHealth(this.playerHealth);

    // Weapon animation
    if (this.weaponMesh) {
      if (this.weaponSwing > 0) {
        this.weaponSwing -= dt * 4;
        this.weaponMesh.rotation.x = -this.weaponSwing * 1.2;
        this.weaponMesh.rotation.z = 0.3 + this.weaponSwing * 0.5;
      }
    }

    // Sync position
    this.syncPosition();

    // Render
    this.sceneManager.render();
  };

  private updateInteraction(): void {
    if (this.localRole === 'spectator') return;

    const intersections = this.sceneManager.raycastFromCamera(4);
    let highlight = '';

    if (intersections.length > 0) {
      const hit = intersections[0];
      let current = hit.object;
      while (current) {
        if (current.userData?.transformable) {
          highlight = current.userData.name || current.uuid;
          break;
        }
        current = current.parent!;
      }
    }

    if (highlight !== this.highlightedObjectId) {
      this.highlightedObjectId = highlight;
    }

    // Update prompt
    if (this.highlightedObjectId) {
      if (this.localRole === 'hider') {
        this.ui.updateInteractPrompt(`📦 ${this.highlightedObjectId} — Press E to Transform`, true);
        this.ui.showTransformButton(true, this.isTransformed);
      } else if (this.localRole === 'seeker') {
        this.ui.updateInteractPrompt(`🪓 ${this.highlightedObjectId} — Click to Attack`, true);
      }
    } else if (this.isTransformed) {
      this.ui.updateInteractPrompt('Press E to Un-transform', true);
      this.ui.showTransformButton(true, true);
    } else {
      this.ui.updateInteractPrompt('', false);
      this.ui.showTransformButton(false, false);
    }
  }

  private syncPosition(): void {
    const now = Date.now();
    if (now - this.lastSyncTime < this.syncRate) return;
    this.lastSyncTime = now;

    const state = this.playerController.getState();
    this.network.sendPlayerState({
      id: this.localId,
      name: '',
      role: this.localRole,
      position: state.position,
      rotation: state.rotation,
      health: this.playerHealth,
      isTransformed: this.isTransformed,
      objectTimer: this.objectTimer,
      isAlive: this.playerHealth > 0,
      isHost: this.network.isHostPlayer()
    });
  }
}

// ========== INITIALIZE ==========
window.addEventListener('DOMContentLoaded', async () => {
  const game = new ObjectHuntGame();
  await game.init();
});