import { GamePhase, PlayerState, RoomSettings, PlayerRole } from '../utils/types';

export class UIManager {
  private isMobile = false;
  private elements: Map<string, HTMLElement> = new Map();

  onCreateRoom?: (settings: RoomSettings) => void;
  onJoinRoom?: (code: string) => void;
  onStartGame?: () => void;
  onLeaveRoom?: () => void;
  onToggleView?: () => void;
  onResume?: () => void;
  onRestart?: () => void;
  onMainMenu?: () => void;
  onReady?: () => void;
  onReplicate?: () => void;

  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;
    this.cacheElements();
  }

  private cacheElements(): void {
    const ids = [
      'loading', 'main-menu', 'lobby', 'hud', 'mobile-controls',
      'game-over', 'create-room-panel', 'join-room-panel',
      'hud-mode', 'hud-timer', 'health-fill', 'health-text',
      'obj-timer-fill', 'obj-timer-text', 'obj-timer-row',
      'weapon-indicator', 'crosshair', 'interact-prompt', 'message-popup',
      'hiding-phase-overlay', 'hiding-phase-text',
      'result-icon', 'result-title', 'result-desc',
      'player-list', 'room-code-display', 'player-count',
      'settings-map', 'settings-players', 'settings-hidemode',
      'settings-hiding', 'settings-seeking', 'settings-object',
      'settings-replica-limit', 'settings-replica-duration',
      'joystick-area', 'joystick-thumb', 'joystick-base',
      'btn-attack', 'btn-jump', 'btn-interact', 'btn-pause',
      'btn-transform', 'btn-untransform', 'btn-spectate', 'btn-replicate',
      'room-code-input', 'hud-replica-count', 'role-card',
      'seeker-waiting'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.elements.set(id, el);
    });
  }

  private get(id: string): HTMLElement | null {
    return this.elements.get(id) || null;
  }

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

  showLobby(roomCode: string, players: PlayerState[], isHost: boolean, maxPlayers: number = 10): void {
    const lobby = document.getElementById('lobby');
    const isAlreadyShowing = lobby && lobby.style.display === 'flex';

    if (!isAlreadyShowing) {
      this.hideAll();
      if (lobby) lobby.style.display = 'flex';
    }

    const codeEl = this.get('room-code-display');
    if (codeEl) codeEl.textContent = roomCode;

    const countEl = this.get('player-count');
    if (countEl) countEl.textContent = `${players.length} / ${maxPlayers}`;

    this.updatePlayerList(players);

    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) startBtn.style.display = isHost ? 'block' : 'none';

    if (!this._lobbyListenersAttached) {
      this._lobbyListenersAttached = true;
      this.attachLobbyListeners();
    }
  }

  private _lobbyListenersAttached = false;

  private attachLobbyListeners(): void {
    const startBtn = document.getElementById('btn-start-game');
    const leaveBtn = document.getElementById('btn-leave-room');
    const readyBtn = document.getElementById('btn-ready');
    const codeEl = document.getElementById('room-code-display');

    if (startBtn) {
      startBtn.onclick = () => this.onStartGame?.();
    }

    if (leaveBtn) {
      leaveBtn.onclick = () => {
        this._lobbyListenersAttached = false;
        this.onLeaveRoom?.();
      };
    }

    if (readyBtn) {
      readyBtn.onclick = () => this.onReady?.();
    }

    if (codeEl) {
      codeEl.onclick = () => {
        const code = codeEl.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          this.showMessage('Room code copied!', '#4CAF50', 1500);
        }).catch(() => {});
      };
    }
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

  showRoleCard(role: PlayerRole): void {
    const card = this.get('role-card');
    if (!card) return;
    card.style.display = 'flex';
    const title = card.querySelector('.role-card-title') as HTMLElement | null;
    const subtitle = card.querySelector('.role-card-subtitle') as HTMLElement | null;
    if (title) {
      title.textContent = role === 'hider' ? 'YOU ARE A HIDER' : 'YOU ARE A SEEKER';
      title.style.color = role === 'hider' ? '#2196F3' : '#f44336';
    }
    if (subtitle) {
      subtitle.textContent = role === 'hider'
        ? 'Disguise yourself as an object!'
        : 'Find and eliminate all hiders!';
    }
    setTimeout(() => { card.style.display = 'none'; }, 3000);
  }

  showGameOver(winner: 'hiders' | 'seekers', localRole: PlayerRole, localIsAlive: boolean): void {
    const el = this.get('game-over');
    if (el) el.style.display = 'flex';

    const icon = this.get('result-icon');
    const title = this.get('result-title');
    const desc = this.get('result-desc');

    const playerWon = (winner === 'hiders' && localRole === 'hider') ||
                      (winner === 'seekers' && localRole === 'seeker');

    if (icon) icon.textContent = playerWon ? '\uD83C\uDFC6' : '\uD83D\uDC80';
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
    const seekerWait = this.get('seeker-waiting');

    if (phase === 'hiding') {
      if (phaseEl) phaseEl.style.display = 'flex';
      if (phaseText) phaseText.textContent = 'HIDING PHASE: ';
      if (seekerWait) seekerWait.style.display = 'flex';
    } else {
      if (phaseEl) phaseEl.style.display = 'none';
      if (seekerWait) seekerWait.style.display = 'none';
    }
  }

  updatePhaseTimer(timer: number): void {
    const phaseText = this.get('hiding-phase-text');
    const timerEl = this.get('hud-timer');
    const seekerWait = this.get('seeker-waiting');

    const mins = Math.floor(timer / 60);
    const secs = Math.floor(timer % 60);
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (phaseText && phaseText.textContent?.includes('HIDING')) {
      phaseText.textContent = `HIDING PHASE: ${Math.ceil(timer)}`;
      if (seekerWait) {
        seekerWait.textContent = `Hiders are hiding... ${Math.ceil(timer)}s`;
      }
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

  updateReplicaCount(current: number, max: number): void {
    const el = this.get('hud-replica-count');
    if (el) {
      el.textContent = `Copies: ${current}/${max}`;
      el.style.display = 'flex';
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

  private updatePlayerList(players: PlayerState[]): void {
    const list = this.get('player-list');
    if (!list) return;

    list.innerHTML = '';
    players.forEach(p => {
      const li = document.createElement('li');
      const bg = p.isHost ? 'rgba(255,152,0,0.15)' : 'rgba(255,255,255,0.05)';
      const border = p.isHost ? 'rgba(255,152,0,0.3)' : 'transparent';
      li.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 12px;margin:4px 0;background:${bg};border-radius:6px;border:1px solid ${border};font-size:0.9em;`;

      const dot = document.createElement('span');
      dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${p.isAlive ? '#4CAF50' : '#f44336'};flex-shrink:0;`;

      const name = document.createElement('span');
      name.textContent = p.name + (p.role === 'seeker' ? ' \uD83D\uDD2D' : '');
      name.style.flex = '1';

      const badge = document.createElement('span');
      let badgeText = '';
      if (p.isHost) badgeText = '\uD83D\uDC51 HOST';
      else if (p.role === 'seeker') badgeText = '\uD83D\uDD2D SEEKER';
      else if (p.role === 'hider') badgeText = '\uD83D\uDCE6 HIDER';
      badge.textContent = badgeText;
      if (badgeText) {
        badge.style.cssText = `color:${p.role === 'seeker' ? '#f44336' : '#FF9800'};font-size:0.8em;font-weight:700;`;
      }

      li.appendChild(dot);
      li.appendChild(name);
      li.appendChild(badge);
      list.appendChild(li);
    });
  }

  private setupMenuListeners(): void {
    const createBtn = document.getElementById('btn-create-room');
    const joinBtn = document.getElementById('btn-join-room');

    if (createBtn) {
      createBtn.onclick = () => this.showCreateRoomPanel();
    }

    if (joinBtn) {
      joinBtn.onclick = () => this.showJoinRoomPanel();
    }
  }

  private showCreateRoomPanel(): void {
    const panel = this.get('create-room-panel');
    if (panel) panel.style.display = 'flex';

    const confirmBtn = document.getElementById('btn-confirm-create');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const settings = this.getHostSettings();
        this.onCreateRoom?.(settings);
        if (panel) panel.style.display = 'none';
        confirmBtn.onclick = null;
      };
    }
  }

  private showJoinRoomPanel(): void {
    const panel = this.get('join-room-panel');
    if (panel) panel.style.display = 'flex';

    const joinBtn = document.getElementById('btn-confirm-join');
    if (joinBtn) {
      joinBtn.onclick = () => {
        const input = this.get('room-code-input') as HTMLInputElement;
        const code = input?.value?.toUpperCase().trim();
        if (code && code.length >= 4) {
          this.onJoinRoom?.(code);
          if (panel) panel.style.display = 'none';
          joinBtn.onclick = null;
        }
      };
    }
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
      replicaLimit: parseInt(getVal('settings-replica-limit') || '3'),
      replicaDuration: parseInt(getVal('settings-replica-duration') || '10'),
      difficulty: 'normal'
    };
  }

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
