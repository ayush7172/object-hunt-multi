// Input Manager - handles keyboard, mouse, touch

import { InputState } from '../utils/types';

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseLocked = false;
  private touchJoystick = { x: 0, y: 0, active: false };
  private touchLook = { active: false, lastX: 0, lastY: 0, lastTouchId: -1 };
  
  // Callbacks
  onPointerLockChange?: (locked: boolean) => void;
  onInteract?: () => void;
  onAttack?: () => void;
  onJump?: () => void;
  onToggleView?: () => void;
  onPause?: () => void;

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

    document.addEventListener('mousemove', (e) => {
      if (!this.mouseLocked) return;
      // Mouse look handled by player controller
    });
  }

  private setupTouch(): void {
    const joystickArea = document.getElementById('joystick-area');
    const joystickThumb = document.getElementById('joystick-thumb');
    const joystickBase = document.getElementById('joystick-base');

    if (!joystickArea || !joystickThumb || !joystickBase) return;

    // Joystick
    joystickArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.touchJoystick.active = true;
      const rect = joystickBase.getBoundingClientRect();
      this.touchJoystick.x = rect.left + rect.width / 2;
      this.touchJoystick.y = rect.top + rect.height / 2;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (this.touchJoystick.active) {
          const dx = touch.clientX - this.touchJoystick.x;
          const dy = touch.clientY - this.touchJoystick.y;
          const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 50);
          const angle = Math.atan2(dy, dx);
          
          joystickThumb.style.left = (35 + Math.cos(angle) * dist) + 'px';
          joystickThumb.style.top = (35 + Math.sin(angle) * dist) + 'px';
          
          this.touchJoystick.x = Math.cos(angle) * (dist / 50);
          this.touchJoystick.y = Math.sin(angle) * (dist / 50);
        }
      }
    }, { passive: false });

    const resetJoystick = () => {
      this.touchJoystick.active = false;
      this.touchJoystick.x = 0;
      this.touchJoystick.y = 0;
      joystickThumb.style.left = '35px';
      joystickThumb.style.top = '35px';
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
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchLook.lastTouchId && this.touchLook.active) {
          const dx = touch.clientX - this.touchLook.lastX;
          const dy = touch.clientY - this.touchLook.lastY;
          // Handled by player controller via touchmove
          this.touchLook.lastX = touch.clientX;
          this.touchLook.lastY = touch.clientY;
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

    // Buttons
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
      moveForward: this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touchJoystick.y < -0.1,
      moveBackward: this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.touchJoystick.y > 0.1,
      moveLeft: this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touchJoystick.x < -0.1,
      moveRight: this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touchJoystick.x > 0.1,
      jump: this.keys.has('Space'),
      interact: this.keys.has('KeyE'),
      attack: false, // handled via click/touch
      toggleView: this.keys.has('KeyV')
    };
  }

  getTouchJoystick(): { x: number; y: number } {
    return { x: this.touchJoystick.x, y: this.touchJoystick.y };
  }

  getTouchLookDelta(): { x: number; y: number } | null {
    if (!this.touchLook.active) return null;
    // This is handled in player controller via touchmove
    return null;
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