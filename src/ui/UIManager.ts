// UI Manager - handles all screens: menu, lobby, HUD, game over

import { GamePhase, PlayerState, RoomSettings, PlayerRole } from '../utils/types';

export class UIManager {
  private isMobile = false;

  // Cached elements
  private elements: Map<string, HTMLElement> = new Map();

  // Callbacks
  onCreateRoom?: (settings: RoomSettings) => void;
  onJoinRoom?: (code: string) => void;
  onStartGame?: () => void;
  onLeaveRoom?: () => void;
  onToggleView?: () => void;
  onResume?: () => void;
  onRestart?: () => void;
  onMainMenu?: () => void;
  onReady?: () => void;

  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;
    this.cacheElements();
  }

  private cacheElements(): void {
    const ids = [
      'loading', 'main-menu', 'lobby', 'hud', 'mobile-controls',
      'game-over', 'settings-panel', 'create-room-panel', 'join-room-panel',
      'hud-mode', 'hud-timer', 'hud-phase-timer', 'health-fill', 'health-text',
      'obj-timer-fill', 'obj-timer-text', 'obj-timer-row',
      'weapon-indicator', 'crosshair', 'interact-prompt', 'message-popup',
      'hiding-phase-overlay', 'hiding-phase-text',
      'result-icon', 'result-title', 'result-desc',
      'player-list', 'room-code-display', 'player-count',
      'settings-map', 'settings-players', 'settings-hidemode',
      'settings-hiding', 'settings-seeking', 'settings-object',
      'joystick-area', 'joystick-thumb', 'joystick-base',
      'btn-attack', 'btn-jump', 'btn-interact', 'btn-pause',
      'btn-transform', 'btn-untransform', 'btn-spectate',
      'room-code-input'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.elements.set(id, el);
    });
  }

  private get(id: string): HTMLElement | null {
    return this.elements.get(id) || null;
  }

  // Screen transitions
  showLoading(): void {
    this.hideAll();
    const el = this.get('loading');
    if (el) el.style.display = 'flex';
  }

  hideLoading(): void {
    const el = this.get('loading');
    if (el) el.style.display = 'none';
  }

  showMainMenu(): void {
    this.hideAll();
    const el = this.get('main-menu');
    if (el) el.style.display = 'flex';
    this.setupMenuListeners();
  }

  showLobby(roomCode: string, players: PlayerState[], isHost: boolean): void {
    this.hideAll();
    const el = this.get('lobby');
    if (el) el.style.display = 'flex';

    const codeEl = this.get('room-code-display');
    if (codeEl) codeEl.textContent = roomCode;

    const countEl = this.get('player-count');
    if (countEl) countEl.textContent = `${players.length} / ${isHost ? '10' : players.length + ' joined'}`;

    this.updatePlayerList(players);

    // Show/hide host controls
    const settingsPanel = this.get('settings-panel');
    if (settingsPanel) settingsPanel.style.display = isHost ? 'block' : 'none';
  }

  showHUD(): void {
    this.hideAll();
    const el = this.get('hud');
    if (el) el.style.display = 'block';

    if (this.isMobile) {
      const mobile = this.get('mobile-controls');
      if (mobile) mobile.style.display = 'block';
    }
  }

  showGameOver(winner: 'hiders' | 'seekers', localRole: PlayerRole, localIsAlive: boolean): void {
    const el = this.get('game-over');
    if (el) el.style.display = 'flex';

    const icon = this.get('result-icon');
    const title = this.get('result-title');
    const desc = this.get('result-desc');

    const playerWon = (winner === 'hiders' && localRole === 'hider') ||
                      (winner === 'seekers' && localRole === 'seeker');

    if (icon) icon.textContent = playerWon ? '🏆' : '💀';
    if (title) {
      title.textContent = playerWon ? 'YOU WIN!' : 'YOU LOSE!';
      title.style.color = playerWon ? '#4CAF50' : '#f44336';
    }
    if (desc) {
      if (winner === 'hiders') {
        desc.textContent = localRole === 'hider'
          ? 'You survived until time ran out!'
          : 'All hiders were eliminated!';
      } else {
        desc.textContent = localRole === 'seeker'
          ? 'All hiders have been found!'
          : 'You were found and eliminated!';
      }
    }
  }

  hideAll(): void {
    const screens = ['loading', 'main-menu', 'lobby', 'hud', 'game-over', 'mobile-controls'];
    screens.forEach(id => {
      const el = this.get(id);
      if (el) el.style.display = 'none';
    });
  }

  // HUD updates
  updateHUDMode(mode: 'hide' | 'seek'): void {
    const el = this.get('hud-mode');
    if (el) {
      el.textContent = mode === 'hide' ? 'HIDE MODE' : 'SEEK MODE';
      el.style.color = mode === 'hide' ? '#2196F3' : '#f44336';
    }

    const weapon = this.get('weapon-indicator');
    if (weapon) weapon.style.display = mode === 'seek' ? 'flex' : 'none';
  }

  updatePhase(phase: GamePhase): void {
    const phaseEl = this.get('hiding-phase-overlay');
    const phaseText = this.get('hiding-phase-text');

    if (phase === 'hiding') {
      if (phaseEl) phaseEl.style.display = 'flex';
      if (phaseText) phaseText.textContent = 'HIDING PHASE: ';
    } else {
      if (phaseEl) phaseEl.style.display = 'none';
    }
  }

  updatePhaseTimer(timer: number): void {
    const el = this.get('hud-phase-timer');
    const phaseText = this.get('hiding-phase-text');
    const timerEl = this.get('hud-timer');

    const mins = Math.floor(timer / 60);
    const secs = Math.floor(timer % 60);
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (phaseText && phaseText.textContent?.includes('HIDING')) {
      phaseText.textContent = `HIDING PHASE: ${Math.ceil(timer)}`;
    } else if (timerEl) {
      timerEl.textContent = str;
      timerEl.style.color = timer < 30 ? '#f44336' : '#FF9800';
    }
  }

  updateHealth(health: number): void {
    const fill = this.get('health-fill');
    const text = this.get('health-text');
    if (fill) {
      fill.style.width = `${Math.max(0, health)}%`;
      fill.style.background = health < 30
        ? 'linear-gradient(90deg, #f44336, #ff5722)'
        : 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    }
    if (text) text.textContent = Math.max(0, Math.floor(health)).toString();
  }

  updateObjectTimer(timer: number, maxTimer: number): void {
    const row = this.get('obj-timer-row');
    const fill = this.get('obj-timer-fill');
    const text = this.get('obj-timer-text');

    if (timer > 0) {
      if (row) row.style.display = 'flex';
      if (fill) {
        const pct = (timer / maxTimer) * 100;
        fill.style.width = `${pct}%`;
        fill.style.background = timer < 5
          ? 'linear-gradient(90deg, #f44336, #ff5722)'
          : 'linear-gradient(90deg, #FF9800, #FFC107)';
      }
      if (text) text.textContent = `${Math.ceil(timer)}s`;
    } else {
      if (row) row.style.display = 'none';
    }
  }

  updateInteractPrompt(text: string, visible: boolean): void {
    const el = this.get('interact-prompt');
    if (el) {
      el.textContent = text;
      el.style.display = visible ? 'block' : 'none';
    }
  }

  showMessage(text: string, color: string = '#fff', duration: number = 2000): void {
    const el = this.get('message-popup');
    if (!el) return;

    el.textContent = text;
    el.style.color = color;
    el.style.display = 'block';
    el.style.animation = 'none';
    // Force reflow
    void (el as HTMLElement).offsetHeight;
    el.style.animation = 'popIn 0.5s ease';

    setTimeout(() => {
      el.style.display = 'none';
    }, duration);
  }

  showTransformButton(show: boolean, isTransformed: boolean): void {
    const transformBtn = this.get('btn-transform');
    const untransformBtn = this.get('btn-untransform');

    if (this.isMobile) {
      if (transformBtn) transformBtn.style.display = show && !isTransformed ? 'flex' : 'none';
      if (untransformBtn) untransformBtn.style.display = isTransformed ? 'flex' : 'none';
    }
  }

  showSpectateButton(show: boolean): void {
    const btn = this.get('btn-spectate');
    if (btn) btn.style.display = show ? 'flex' : 'none';
  }

  // Player list
  private updatePlayerList(players: PlayerState[]): void {
    const list = this.get('player-list');
    if (!list) return;

    list.innerHTML = '';
    players.forEach(p => {
      const li = document.createElement('li');
      li.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px; margin: 4px 0;
        background: ${p.isHost ? 'rgba(255,152,0,0.15)' : 'rgba(255,255,255,0.05)'};
        border-radius: 6px; border: 1px solid ${p.isHost ? 'rgba(255,152,0,0.3)' : 'transparent'};
        font-size: 0.9em;
      `;
      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 8px; height: 8px; border-radius: 50%;
        background: ${p.isAlive ? '#4CAF50' : '#f44336'};
      `;
      const name = document.createElement('span');
      name.textContent = p.name;
      name.style.flex = '1';
      const hostBadge = document.createElement('span');
      if (p.isHost) {
        hostBadge.textContent = '👑 HOST';
        hostBadge.style.cssText = 'color: #FF9800; font-size: 0.8em; font-weight: 700;';
      }
      li.appendChild(dot);
      li.appendChild(name);
      li.appendChild(hostBadge);
      list.appendChild(li);
    });
  }

  // Menu listeners
  private setupMenuListeners(): void {
    const createBtn = document.getElementById('btn-create-room');
    const joinBtn = document.getElementById('btn-join-room');
    const startBtn = document.getElementById('btn-start-game');
    const leaveBtn = document.getElementById('btn-leave-room');
    const readyBtn = document.getElementById('btn-ready');

    createBtn?.addEventListener('click', () => {
      this.showCreateRoomPanel();
    });

    joinBtn?.addEventListener('click', () => {
      this.showJoinRoomPanel();
    });

    startBtn?.addEventListener('click', () => {
      const settings = this.getHostSettings();
      this.onCreateRoom?.(settings);
    });

    leaveBtn?.addEventListener('click', () => {
      this.onLeaveRoom?.();
      this.showMainMenu();
    });

    readyBtn?.addEventListener('click', () => {
      this.onReady?.();
    });
  }

  private showCreateRoomPanel(): void {
    const panel = this.get('create-room-panel');
    if (panel) panel.style.display = 'flex';

    const confirmBtn = document.getElementById('btn-confirm-create');
    confirmBtn?.addEventListener('click', () => {
      const settings = this.getHostSettings();
      this.onCreateRoom?.(settings);
      if (panel) panel.style.display = 'none';
    }, { once: true });
  }

  private showJoinRoomPanel(): void {
    const panel = this.get('join-room-panel');
    if (panel) panel.style.display = 'flex';

    const joinBtn = document.getElementById('btn-confirm-join');
    joinBtn?.addEventListener('click', () => {
      const input = this.get('room-code-input') as HTMLInputElement;
      const code = input?.value?.toUpperCase().trim();
      if (code && code.length >= 4) {
        this.onJoinRoom?.(code);
        if (panel) panel.style.display = 'none';
      }
    }, { once: true });
  }

  private getHostSettings(): RoomSettings {
    const getVal = (id: string): string => {
      const el = document.getElementById(id) as HTMLSelectElement;
      return el?.value || '';
    };

    return {
      mapId: getVal('settings-map') || 'house_garden',
      maxPlayers: parseInt(getVal('settings-players') || '8'),
      hideMode: (getVal('settings-hidemode') as 'team' | 'solo') || 'team',
      hidingTime: parseInt(getVal('settings-hiding') || '20'),
      seekingTime: parseInt(getVal('settings-seeking') || '180'),
      objectTime: parseInt(getVal('settings-object') || '15'),
      difficulty: 'normal'
    };
  }

  // Mobile controls visibility
  showMobileControls(show: boolean): void {
    const el = this.get('mobile-controls');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  isMobileDevice(): boolean {
    return this.isMobile;
  }

  hideHidingPhase(): void {
    const el = this.get('hiding-phase-overlay');
    if (el) el.style.display = 'none';
  }
}