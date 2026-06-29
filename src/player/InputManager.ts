import { InputState } from '../utils/types';

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseLocked = false;

  // Separate joystick center (pixels) from direction (-1..1)
  private joystickCenter = { x: 0, y: 0 };
  private joystickDir = { x: 0, y: 0, activeTouchId: -1, active: false };

  private touchLook = { active: false, lastX: 0, lastY: 0, lastTouchId: -1, deltaX: 0, deltaY: 0 };

  onPointerLockChange?: (locked: boolean) => void;
  onInteract?: () => void;
  onAttack?: () => void;
  onJump?: () => void;
  onToggleView?: () => void;
  onPause?: () => void;
  onTouchLook?: (dx: number, dy: number) => void;

  constructor(private canvas: HTMLCanvasElement, private isMobile: boolean) {
    this.setupKeyboard();
    this.setupMouse();
    if (isMobile) this.setupTouch();
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyE') this.onInteract?.();
      if (e.code === 'Space') this.onJump?.();
      if (e.code === 'KeyV') this.onToggleView?.();
      if (e.code === 'Escape') this.onPause?.();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  private setupMouse(): void {
    this.canvas.addEventListener('click', () => {
      if (!this.mouseLocked && !this.isMobile) {
        this.canvas.requestPointerLock();
      }
      if (this.mouseLocked) {
        this.onAttack?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === this.canvas;
      this.onPointerLockChange?.(this.mouseLocked);
    });
  }

  private setupTouch(): void {
    const joystickArea = document.getElementById('joystick-area');
    const joystickThumb = document.getElementById('joystick-thumb');
    const joystickBase = document.getElementById('joystick-base');

    if (!joystickArea || !joystickThumb || !joystickBase) return;

    joystickArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = joystickBase.getBoundingClientRect();
      this.joystickCenter.x = rect.left + rect.width / 2;
      this.joystickCenter.y = rect.top + rect.height / 2;
      this.joystickDir.active = true;
      this.joystickDir.activeTouchId = touch.identifier;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickDir.activeTouchId && this.joystickDir.active) {
          const dx = touch.clientX - this.joystickCenter.x;
          const dy = touch.clientY - this.joystickCenter.y;
          const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 50);
          const angle = Math.atan2(dy, dx);

          joystickThumb.style.left = (35 + Math.cos(angle) * dist) + 'px';
          joystickThumb.style.top = (35 + Math.sin(angle) * dist) + 'px';

          this.joystickDir.x = Math.cos(angle) * (dist / 50);
          this.joystickDir.y = Math.sin(angle) * (dist / 50);
        }
      }
    }, { passive: false });

    const resetJoystick = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickDir.activeTouchId) {
          this.joystickDir.active = false;
          this.joystickDir.activeTouchId = -1;
          this.joystickDir.x = 0;
          this.joystickDir.y = 0;
          joystickThumb.style.left = '35px';
          joystickThumb.style.top = '35px';
        }
      }
    };

    document.addEventListener('touchend', resetJoystick);
    document.addEventListener('touchcancel', resetJoystick);

    // Look area (right side of screen)
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      if (touch.clientX > window.innerWidth * 0.3) {
        this.touchLook.active = true;
        this.touchLook.lastTouchId = touch.identifier;
        this.touchLook.lastX = touch.clientX;
        this.touchLook.lastY = touch.clientY;
        this.touchLook.deltaX = 0;
        this.touchLook.deltaY = 0;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchLook.lastTouchId && this.touchLook.active) {
          const dx = touch.clientX - this.touchLook.lastX;
          const dy = touch.clientY - this.touchLook.lastY;
          this.touchLook.lastX = touch.clientX;
          this.touchLook.lastY = touch.clientY;
          this.touchLook.deltaX = dx;
          this.touchLook.deltaY = dy;
          this.onTouchLook?.(dx, dy);
        }
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchLook.lastTouchId) {
          this.touchLook.active = false;
        }
      }
    });

    const setupBtn = (id: string, callback: () => void) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          callback();
        }, { passive: false });
      }
    };

    setupBtn('btn-attack', () => this.onAttack?.());
    setupBtn('btn-jump', () => this.onJump?.());
    setupBtn('btn-interact', () => this.onInteract?.());
    setupBtn('btn-pause', () => this.onPause?.());
  }

  getInputState(): InputState {
    return {
      moveForward: this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.joystickDir.y < -0.1,
      moveBackward: this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.joystickDir.y > 0.1,
      moveLeft: this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.joystickDir.x < -0.1,
      moveRight: this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.joystickDir.x > 0.1,
      jump: this.keys.has('Space'),
      interact: this.keys.has('KeyE'),
      attack: false,
      toggleView: this.keys.has('KeyV')
    };
  }

  getTouchJoystick(): { x: number; y: number } {
    return { x: this.joystickDir.x, y: this.joystickDir.y };
  }

  getTouchLookDelta(): { x: number; y: number } | null {
    if (!this.touchLook.active) return null;
    const dx = this.touchLook.deltaX;
    const dy = this.touchLook.deltaY;
    this.touchLook.deltaX = 0;
    this.touchLook.deltaY = 0;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
    return { x: dx, y: dy };
  }

  isPointerLocked(): boolean {
    return this.mouseLocked;
  }

  requestPointerLock(): void {
    this.canvas.requestPointerLock();
  }

  exitPointerLock(): void {
    document.exitPointerLock();
  }
}
