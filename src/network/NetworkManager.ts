// Network Manager - WebRTC mesh + Firebase signaling

import { 
  initializeApp, 
  FirebaseApp 
} from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  Auth, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  collection,
  query,
  where
} from 'firebase/firestore';
import { 
  getDatabase, 
  Database, 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  push,
  remove,
  onDisconnect
} from 'firebase/database';

import { NetworkMessage, RoomState, RoomSettings, PlayerState, GameEvent } from '../utils/types';

export class NetworkManager {
  private firebaseApp: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private rtdb: Database | null = null;
  private currentUser: User | null = null;
  
  // WebRTC
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private localId: string = '';
  
  // Room
  private roomId: string = '';
  private isHost = false;
  private roomUnsubscribe: (() => void) | null = null;
  private signalingUnsubscribe: (() => void) | null = null;
  
  // Callbacks
  onRoomStateChange?: (state: RoomState | null) => void;
  onPlayerJoin?: (player: PlayerState) => void;
  onPlayerLeave?: (playerId: string) => void;
  onGameEvent?: (event: GameEvent) => void;
  onConnected?: (peerId: string) => void;
  onDisconnected?: (peerId: string) => void;
  onError?: (error: string) => void;
  
  // Config
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  async initialize(firebaseConfig: Record<string, string>): Promise<string> {
    this.firebaseApp = initializeApp(firebaseConfig as any);
    this.auth = getAuth(this.firebaseApp);
    this.db = getFirestore(this.firebaseApp);
    this.rtdb = getDatabase(this.firebaseApp);
    
    const result = await signInAnonymously(this.auth);
    this.currentUser = result.user;
    this.localId = this.currentUser.uid;
    
    return this.localId;
  }

  // Room management
  async createRoom(settings: RoomSettings): Promise<string> {
    if (!this.db || !this.currentUser) throw new Error('Not initialized');
    
    const roomId = this.generateRoomCode();
    this.roomId = roomId;
    this.isHost = true;
    
    const roomRef = doc(this.db, 'rooms', roomId);
    const roomState: RoomState = {
      id: roomId,
      hostId: this.localId,
      settings,
      phase: 'lobby',
      players: {
        [this.localId]: {
          id: this.localId,
          name: `Player${this.localId.slice(0, 4)}`,
          role: 'hider',
          position: { x: 0, y: 1.6, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          health: 100,
          isTransformed: false,
          objectTimer: 0,
          isAlive: true,
          isHost: true
        }
      },
      phaseTimer: 0,
      gameTimer: 0,
      createdAt: Date.now()
    };
    
    await setDoc(roomRef, roomState);
    this.setupSignalingListener(roomId);
    this.listenToRoom(roomId);
    
    return roomId;
  }

  async joinRoom(roomCode: string): Promise<boolean> {
    if (!this.db || !this.currentUser) throw new Error('Not initialized');
    
    const roomRef = doc(this.db, 'rooms', roomCode.toUpperCase());
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      this.onError?.('Room not found');
      return false;
    }
    
    const roomState = roomSnap.data() as RoomState;
    
    if (Object.keys(roomState.players).length >= roomState.settings.maxPlayers) {
      this.onError?.('Room is full');
      return false;
    }
    
    this.roomId = roomCode.toUpperCase();
    this.isHost = false;
    
    const newPlayer: PlayerState = {
      id: this.localId,
      name: `Player${this.localId.slice(0, 4)}`,
      role: 'hider',
      position: { x: 0, y: 1.6, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      isTransformed: false,
      objectTimer: 0,
      isAlive: true,
      isHost: false
    };
    
    await updateDoc(roomRef, {
      [`players.${this.localId}`]: newPlayer
    });
    
    this.setupSignalingListener(this.roomId);
    this.listenToRoom(this.roomId);
    
    return true;
  }

  async leaveRoom(): Promise<void> {
    if (!this.db) return;
    
    this.peerConnections.forEach((pc) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.dataChannels.clear();
    
    if (this.signalingUnsubscribe) {
      this.signalingUnsubscribe();
      this.signalingUnsubscribe = null;
    }
    
    if (this.roomUnsubscribe) {
      this.roomUnsubscribe();
      this.roomUnsubscribe = null;
    }
    
    if (this.roomId) {
      const roomRef = doc(this.db, 'rooms', this.roomId);
      await updateDoc(roomRef, {
        [`players.${this.localId}`]: null
      });
    }
    
    this.roomId = '';
    this.isHost = false;
  }

  private listenToRoom(roomId: string): void {
    if (!this.db) return;
    
    const roomRef = doc(this.db, 'rooms', roomId);
    
    this.roomUnsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.data() as RoomState;
        this.onRoomStateChange?.(state);
      } else {
        this.onRoomStateChange?.(null);
      }
    }, (error) => {
      this.onError?.(`Room listener error: ${error.message}`);
    });
  }

  private setupSignalingListener(roomId: string): void {
    if (!this.rtdb) return;
    
    const signalingRef = ref(this.rtdb, `signaling/${roomId}`);
    
    this.signalingUnsubscribe = () => {
      off(signalingRef);
    };
    
    onValue(signalingRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      
      Object.entries(data).forEach(([key, value]: [string, any]) => {
        if (value.to === this.localId && value.from !== this.localId) {
          this.handleSignal(value.from, value.signal);
        }
      });
    });
  }

  private async handleSignal(fromId: string, signal: any): Promise<void> {
    let pc = this.peerConnections.get(fromId);
    
    if (!pc) {
      pc = this.createPeerConnection(fromId);
    }
    
    if (signal.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.sendSignal(fromId, pc.localDescription!);
    } else if (signal.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signal));
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, pc);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, event.candidate);
      }
    };
    
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.onConnected?.(peerId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.onDisconnected?.(peerId);
        this.cleanupPeer(peerId);
      }
    };
    
    const isInitiator = this.isHost || this.localId > peerId;
    if (isInitiator) {
      const dc = pc.createDataChannel('game', { ordered: true });
      this.setupDataChannel(peerId, dc);
    }
    
    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };
    
    return pc;
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.onConnected?.(peerId);
    };
    
    channel.onclose = () => {
      this.onDisconnected?.(peerId);
    };
    
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(peerId, message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
    
    this.dataChannels.set(peerId, channel);
  }

  private handleMessage(_fromId: string, message: any): void {
    switch (message.type) {
      case 'game-event':
        this.onGameEvent?.(message.payload);
        break;
      case 'player-state':
        break;
      case 'room-state':
        break;
    }
  }

  private async sendSignal(toId: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit): Promise<void> {
    if (!this.rtdb || !this.roomId) return;
    
    const signalingRef = ref(this.rtdb, `signaling/${this.roomId}/${Date.now()}_${Math.random()}`);
    await set(signalingRef, {
      from: this.localId,
      to: toId,
      signal,
      timestamp: Date.now()
    });
  }

  sendGameEvent(event: GameEvent): void {
    this.broadcast({
      type: 'game-event',
      payload: event
    });
  }

  sendPlayerState(state: PlayerState): void {
    this.broadcast({
      type: 'player-state',
      payload: state
    });
  }

  sendRoomState(state: RoomState): void {
    if (!this.isHost) return;
    this.broadcast({
      type: 'room-state',
      payload: state
    });
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(data);
      }
    });
  }

  async updateRoomState(state: Partial<RoomState>): Promise<void> {
    if (!this.db || !this.isHost || !this.roomId) return;
    
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await updateDoc(roomRef, state);
  }

  async startGame(settings: RoomSettings): Promise<void> {
    if (!this.isHost || !this.db) return;

    const roomRef = doc(this.db, 'rooms', this.roomId);

    const roomSnap = await getDoc(roomRef);
    const roomState = roomSnap.data() as RoomState;
    const playerIds = Object.keys(roomState.players);
    const numSeekers = Math.max(1, Math.floor(playerIds.length / 4));
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    const updates: Record<string, any> = {
      phase: 'hiding',
      phaseTimer: settings.hidingTime,
      gameTimer: settings.seekingTime,
      'settings.mapId': settings.mapId,
      'settings.maxPlayers': settings.maxPlayers,
      'settings.hideMode': settings.hideMode,
      'settings.hidingTime': settings.hidingTime,
      'settings.seekingTime': settings.seekingTime,
      'settings.objectTime': settings.objectTime,
      'settings.replicaLimit': settings.replicaLimit || 0,
      'settings.replicaDuration': settings.replicaDuration || 10,
      'settings.difficulty': settings.difficulty || 'normal',
    };

    playerIds.forEach((id, index) => {
      updates[`players.${id}.role`] = index < numSeekers ? 'seeker' : 'hider';
      updates[`players.${id}.isAlive`] = true;
      updates[`players.${id}.health`] = 100;
      updates[`players.${id}.replicaCount`] = 0;
    });

    await updateDoc(roomRef, updates);
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private cleanupPeer(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.dataChannels.delete(peerId);
  }

  getLocalId(): string {
    return this.localId;
  }

  getRoomId(): string {
    return this.roomId;
  }

  isHostPlayer(): boolean {
    return this.isHost;
  }

  getConnectedPeers(): string[] {
    return Array.from(this.peerConnections.keys());
  }
}