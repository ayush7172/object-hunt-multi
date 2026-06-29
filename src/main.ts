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
import { getMapById } from './maps/MapConfig';
import { RoomSettings, PlayerState, GameEvent, GamePhase, RoomState } from './utils/types';

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

interface ReplicaInfo {
  mesh: THREE.Object3D;
  timer: number;
}

class ObjectHuntGame {
  private canvas!: HTMLCanvasElement;
  private sceneManager!: SceneManager;
  private playerController!: PlayerController;
  private inputManager!: InputManager;
  private gameState: GameStateManager;
  private network: NetworkManager;
  private audio: AudioManager;
  private ui: UIManager;
  private mapLoader!: MapLoader;

  private remotePlayers: Map<string, RemotePlayer> = new Map();

  private isRunning = false;
  private isPaused = false;
  private localId = '';
  private phase: GamePhase = 'lobby';
  private phaseTimer = 0;
  private objectTimerMax = 15;
  private isTransformed = false;
  private transformedObjectId = '';
  private highlightedObjectId = '';
  private playerHealth = 100;
  private localRole: 'hider' | 'seeker' | 'spectator' = 'hider';

  private replicas: ReplicaInfo[] = [];
  private replicaCount = 0;
  private replicaLimit = 3;
  private replicaDuration = 10;

  private weaponSwing = 0;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime = 0;
  private syncRate = 1000 / 20;
  private roleCardShown = false;

  constructor() {
    this.gameState = new GameStateManager();
    this.network = new NetworkManager();
    this.audio = new AudioManager();
    this.ui = new UIManager();
  }

  async init(): Promise<void> {
    this.ui.showLoading();

    try {
      this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        document.body.prepend(this.canvas);
      }

      this.sceneManager = new SceneManager(this.canvas);
      this.inputManager = new InputManager(this.canvas, this.ui.isMobileDevice());
      this.mapLoader = new MapLoader(this.sceneManager.scene);
      this.playerController = new PlayerController(this.sceneManager, this.inputManager);

      document.addEventListener('click', () => this.audio.init(), { once: true });
      document.addEventListener('touchstart', () => this.audio.init(), { once: true });

      this.inputManager.onInteract = () => this.handleInteract();
      this.inputManager.onAttack = () => this.handleAttack();
      this.inputManager.onJump = () => {};
      this.inputManager.onToggleView = () => this.playerController.toggleThirdPerson();
      this.inputManager.onPause = () => this.handlePause();
      this.inputManager.onReplicate = () => this.handleReplicate();
      this.inputManager.onTouchLook = (dx, dy) => {
        this.playerController.handleTouchLook(dx, dy);
      };

      document.addEventListener('mousemove', (e) => {
        if (this.inputManager.isPointerLocked()) {
          this.playerController.handleMouseMove(e.movementX, e.movementY);
        }
      });

      this.network.onRoomStateChange = (state) => {
        if (state) {
          this.gameState.setRoomState(state);
          this.localId = this.network.getLocalId();
          this.gameState.setLocalPlayerId(this.localId);
          this.handleRoomUpdate(state);
        }
      };

      this.network.onGameEvent = (event) => this.handleGameEvent(event);
      this.network.onConnected = (peerId) => this.handlePeerConnected(peerId);
      this.network.onDisconnected = (peerId) => this.handlePeerDisconnected(peerId);
      this.network.onError = (error) => this.ui.showMessage(error, '#f44336');

      this.ui.onCreateRoom = (settings) => this.createRoom(settings);
      this.ui.onJoinRoom = (code) => this.joinRoom(code);
      this.ui.onStartGame = () => this.startGame();
      this.ui.onLeaveRoom = () => this.leaveRoom();

      window.addEventListener('resize', () => this.sceneManager.resize());

      this.ui.hideLoading();
      this.ui.showMainMenu();

      if (!isFirebaseConfigured()) {
        this.ui.showMessage('Firebase not configured — set GitHub Secrets in repo settings', '#FF9800', 10000);
      }

      this.isRunning = true;
      this.animate();
    } catch (e) {
      console.error('Game init failed:', e);
      this.ui.hideLoading();
      this.ui.showMessage(`Failed to load: ${e instanceof Error ? e.message : 'Unknown error'}`, '#f44336', 10000);
    }
  }

  private async createRoom(settings: RoomSettings): Promise<void> {
    if (!isFirebaseConfigured()) {
      this.ui.showMessage('Firebase not configured. Add secrets to GitHub repo settings.', '#f44336', 8000);
      return;
    }
    try {
      this.localId = await this.network.initialize(FIREBASE_CONFIG);
      const roomCode = await this.network.createRoom(settings);
      this.replicaLimit = settings.replicaLimit;
      this.replicaDuration = settings.replicaDuration;
      this.objectTimerMax = settings.objectTime;
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

    try {
      await this.network.startGame(settings);
      console.log('Game start sent to Firebase, settings:', settings);

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
    const settings = this.gameState.getSettings();

    this.objectTimerMax = settings.objectTime;
    this.replicaLimit = settings.replicaLimit;
    this.replicaDuration = settings.replicaDuration;

    const mapConfig = getMapById(mapId);
    this.mapLoader.loadMap(mapConfig);

    const spawns = mapConfig.spawnZones.hider;
    const spawn = spawns[0] || { x: 0, y: 1.6, z: 0 };
    this.playerController.spawn(new THREE.Vector3(spawn.x, 1.6, spawn.z), 0);

    const worldGroup = this.mapLoader.getWorldGroup();
    worldGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.transformable) {
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

    this.ui.showHUD();
    this.ui.updateHUDMode(this.localRole as 'hide' | 'seek');

    const localPlayer = this.gameState.getLocalPlayer();
    if (localPlayer) {
      this.localRole = localPlayer.role;
      this.playerHealth = localPlayer.health;
      this.ui.updateHUDMode(localPlayer.role === 'seeker' ? 'seek' : 'hide');
    }

    this.phase = 'hiding';
    this.gameState.updatePhase('hiding', settings.hidingTime);
    this.ui.updatePhase('hiding');

    this.roleCardShown = false;

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
    this.cleanupReplicas();
    this.ui.showMainMenu();
  }

  private handleRoomUpdate(state: RoomState): void {
    const players = this.gameState.getPlayers();
    const isHost = this.network.isHostPlayer();
    const roomId = this.network.getRoomId();

    const settings = state.settings;
    this.replicaLimit = settings.replicaLimit;
    this.replicaDuration = settings.replicaDuration;
    this.objectTimerMax = settings.objectTime;

    const newPhase = state.phase;
    if (newPhase === 'hiding' && this.phase === 'lobby') {
      this.phase = 'hiding';
      this.beginGameplay(state.settings.mapId);
      return;
    }

    if (newPhase === 'lobby') {
      this.ui.showLobby(roomId, players, isHost, state.settings.maxPlayers);
    }

    const localPlayer = this.gameState.getLocalPlayer();
    if (localPlayer) {
      this.localRole = localPlayer.role;
    }

    this.syncRemotePlayers(players);
  }

  private syncRemotePlayers(players: PlayerState[]): void {
    const existingIds = new Set(this.remotePlayers.keys());
    const newIds = new Set(players.map(p => p.id).filter(id => id !== this.localId));

    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        const rp = this.remotePlayers.get(id);
        if (rp) rp.dispose(this.sceneManager.scene);
        this.remotePlayers.delete(id);
      }
    });

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
      case 'replicate':
        this.handleRemoteReplicate(event.payload);
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
    if (payload.destroyed) {
      this.audio.play('hit_metal');
    }
  }

  private handleRemoteDestroy(payload: any): void {
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

  private handleRemoteReplicate(payload: any): void {
    // Other players see the replica appear
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(payload.scale, payload.scale, payload.scale),
      new THREE.MeshStandardMaterial({ color: payload.color })
    );
    m.position.set(payload.x, payload.y, payload.z);
    this.sceneManager.scene.add(m);
    setTimeout(() => this.sceneManager.scene.remove(m), this.replicaDuration * 1000);
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

    const intersections = this.sceneManager.raycastFromCamera(4);
    if (intersections.length > 0) {
      const hit = intersections[0];
      let current: any = hit.object;
      while (current) {
        if (current.userData?.transformable) {
          const objectId = current.userData.name || current.uuid;
          this.performHit(objectId);
          break;
        }
        current = current.parent;
      }
    }
  }

  private handleReplicate(): void {
    if (this.phase !== 'playing' && this.phase !== 'hiding') return;
    if (this.localRole !== 'hider') return;
    if (!this.isTransformed) return;
    if (this.replicaLimit > 0 && this.replicaCount >= this.replicaLimit) {
      this.ui.showMessage('Replica limit reached!', '#FF9800');
      return;
    }

    const pos = this.playerController.position;
    const color = this.transformedObjectId ? 0xCC8833 : 0x888888;
    const scale = 0.3 + Math.random() * 0.3;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(scale, scale * 0.8, scale),
      new THREE.MeshStandardMaterial({ color })
    );
    mesh.position.set(pos.x, pos.y + 0.2, pos.z + 1);
    mesh.castShadow = true;
    this.sceneManager.scene.add(mesh);

    this.replicas.push({ mesh, timer: this.replicaDuration });
    this.replicaCount++;
    this.ui.updateReplicaCount(this.replicaCount, this.replicaLimit);
    this.ui.showMessage('Replica created!', '#8BC34A');

    this.network.sendGameEvent({
      type: 'replicate',
      payload: {
        hiderId: this.localId,
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
        scale,
        color,
        duration: this.replicaDuration
      },
      timestamp: Date.now(),
      senderId: this.localId
    });
  }

  private transform(): void {
    if (this.isTransformed) return;

    const intersections = this.sceneManager.raycastFromCamera(4);
    if (intersections.length > 0) {
      const hit = intersections[0];
      let current: any = hit.object;
      while (current) {
        if (current.userData?.transformable) {
          const objectId = current.userData.name || current.uuid;
          this.performTransform(objectId);
          break;
        }
        current = current.parent;
      }
    }
  }

  private performTransform(objectId: string): void {
    const success = this.gameState.handleTransform(this.localId, objectId);
    if (success) {
      this.isTransformed = true;
      this.transformedObjectId = objectId;
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

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    const dt = Math.min(this.sceneManager.getDeltaTime(), 0.05);

    if (this.isPaused || this.phase === 'lobby') {
      this.sceneManager.render();
      return;
    }

    // Show role card once at game start
    if (!this.roleCardShown && (this.phase === 'hiding' || this.phase === 'playing')) {
      this.roleCardShown = true;
      this.ui.showRoleCard(this.localRole);
    }

    // Phase timer from GameStateManager
    if (this.phase === 'hiding' || this.phase === 'playing') {
      this.gameState.updateTimer(dt);
      this.ui.updatePhaseTimer(this.gameState.getPhaseTimer());

      // Object disguise timer
      if (this.isTransformed && this.objectTimerMax > 0) {
        const player = this.gameState.getLocalPlayer();
        const objTimer = player ? player.objectTimer : 0;
        if (objTimer > 0) {
          this.gameState.updatePlayerState(this.localId, { objectTimer: objTimer - dt });
          if (objTimer - dt <= 0) {
            this.forceUntransform();
            this.ui.showMessage('Disguise expired!', '#FF9800');
            this.audio.play('timer_warning');
          }
          this.ui.updateObjectTimer(Math.max(0, objTimer - dt), this.objectTimerMax);
        } else {
          this.ui.updateObjectTimer(0, this.objectTimerMax);
        }
      } else {
        this.ui.updateObjectTimer(0, this.objectTimerMax);
      }
    }

    // Seeker frozen during hiding
    if (this.localRole === 'seeker' && this.phase === 'hiding') {
      this.sceneManager.render();
      return;
    }

    // Update replica timers
    this.updateReplicas(dt);

    this.playerController.update(dt);
    this.remotePlayers.forEach(rp => rp.update(dt));
    this.updateInteraction();
    this.ui.updateHealth(this.playerHealth);

    this.weaponSwing = Math.max(0, this.weaponSwing - dt * 4);

    this.syncPosition();
    this.sceneManager.render();
  };

  private updateReplicas(dt: number): void {
    for (let i = this.replicas.length - 1; i >= 0; i--) {
      this.replicas[i].timer -= dt;
      if (this.replicas[i].timer <= 0) {
        this.sceneManager.scene.remove(this.replicas[i].mesh);
        this.replicas.splice(i, 1);
        this.replicaCount--;
      }
    }
    if (this.replicas.length > 0) {
      this.ui.updateReplicaCount(this.replicaCount, this.replicaLimit);
    }
  }

  private updateInteraction(): void {
    if (this.localRole === 'spectator') return;

    const intersections = this.sceneManager.raycastFromCamera(4);
    let highlight = '';

    if (intersections.length > 0) {
      const hit = intersections[0];
      let current: any = hit.object;
      while (current) {
        if (current.userData?.transformable) {
          highlight = current.userData.name || current.uuid;
          break;
        }
        current = current.parent;
      }
    }

    if (highlight !== this.highlightedObjectId) {
      this.highlightedObjectId = highlight;
    }

    if (this.highlightedObjectId) {
      if (this.localRole === 'hider') {
        const replicaHint = this.replicaLimit > 0 ? ' | R to Replicate' : '';
        this.ui.updateInteractPrompt(`Press E to Transform${replicaHint}`, true);
        this.ui.showTransformButton(true, this.isTransformed);
      } else if (this.localRole === 'seeker') {
        this.ui.updateInteractPrompt(`Click to Attack`, true);
      }
    } else if (this.isTransformed) {
      this.ui.updateInteractPrompt('Press E to Un-transform | R to Replicate', true);
      this.ui.showTransformButton(true, true);
    } else {
      this.ui.updateInteractPrompt('', false);
      this.ui.showTransformButton(false, false);
    }
  }

  private cleanupReplicas(): void {
    for (const r of this.replicas) {
      this.sceneManager.scene.remove(r.mesh);
    }
    this.replicas = [];
    this.replicaCount = 0;
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
      objectTimer: 0,
      isAlive: this.playerHealth > 0,
      isHost: this.network.isHostPlayer(),
      replicaCount: this.replicaCount
    });
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const game = new ObjectHuntGame();
  await game.init();
});
